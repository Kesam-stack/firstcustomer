import { NextResponse } from "next/server";
import { Pool } from "pg";
import { query } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import { requireString } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerKey = req.headers.get("x-owner-key") || "";
  if (!ownerKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const auth = await query<{ owner_secret_hash: string; goal_count: number; approved_count: number }>(
    "SELECT owner_secret_hash, goal_count, approved_count FROM bounties WHERE id=$1",
    [id],
  );
  const bounty = auth.rows[0];
  const suppliedHash = hashToken(ownerKey);
  if (!bounty || !safeEqualHex(bounty.owner_secret_hash, suppliedHash)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (bounty.approved_count >= bounty.goal_count) {
    return NextResponse.json({ error: "This bounty goal is already complete." }, { status: 409 });
  }

  try {
    const body = await req.json();
    const referralId = requireString(body.referralId, "Referral", 80);
    const customerReference = requireString(body.customerReference, "Customer reference", 180);

    const referral = await query<{ id: string }>("SELECT id FROM referrals WHERE id=$1 AND bounty_id=$2", [referralId, id]);
    if (!referral.rows[0]) return NextResponse.json({ error: "Referral not found." }, { status: 404 });

    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 1,
    });
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      const locked = await db.query<{ approved_count: number; goal_count: number }>("SELECT approved_count, goal_count FROM bounties WHERE id=$1 FOR UPDATE", [id]);
      if (!locked.rows[0] || locked.rows[0].approved_count >= locked.rows[0].goal_count) throw new Error("This bounty goal is already complete.");
      await db.query("INSERT INTO conversion_claims (bounty_id, referral_id, customer_reference, status) VALUES ($1,$2,$3,'approved')", [id, referralId, customerReference]);
      await db.query("UPDATE referrals SET approved_conversions=approved_conversions+1 WHERE id=$1", [referralId]);
      await db.query("UPDATE bounties SET approved_count=approved_count+1, status=CASE WHEN approved_count+1 >= goal_count THEN 'closed' ELSE status END WHERE id=$1", [id]);
      await db.query("COMMIT");
    } catch (e) {
      await db.query("ROLLBACK");
      throw e;
    } finally {
      db.release();
      await pool.end();
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error(error);
    const pgError = error as { code?: string };
    if (pgError.code === "23505") {
      return NextResponse.json({ error: "That customer reference has already been approved for this bounty." }, { status: 409 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not approve conversion." }, { status: 400 });
  }
}
