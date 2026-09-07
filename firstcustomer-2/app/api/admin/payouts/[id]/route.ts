import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { attemptAutomaticPayout } from "@/lib/payouts";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = await query<{ id: string; payout_status: string }>("SELECT id,payout_status FROM conversion_claims WHERE id=$1", [id]);
  if (!row.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  if (String(body.action || "") !== "retry") return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  if (row.rows[0].payout_status === "paid") return NextResponse.json({ status: "paid" });
  return NextResponse.json(await attemptAutomaticPayout(id));
}
