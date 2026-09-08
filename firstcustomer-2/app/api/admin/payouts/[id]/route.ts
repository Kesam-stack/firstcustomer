import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { attemptAutomaticPayout } from "@/lib/payouts";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const row = await query<{ id: string; payout_status: string; fraud_status: string }>(
    "SELECT id,payout_status,fraud_status FROM conversion_claims WHERE id=$1",
    [id],
  );
  if (!row.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "risk") {
    const next = String(body.status || "");
    if (!["clear", "review", "blocked"].includes(next)) {
      return NextResponse.json({ error: "Invalid risk status" }, { status: 400 });
    }

    const reason = String(body.reason || "").trim().slice(0, 160);
    await query(
      `UPDATE conversion_claims
          SET fraud_status=$2,
              fraud_score=CASE
                WHEN $2='blocked' THEN GREATEST(fraud_score,90)
                WHEN $2='review' THEN GREATEST(fraud_score,20)
                ELSE fraud_score
              END,
              fraud_reasons=CASE
                WHEN $3 <> '' AND NOT ($3=ANY(fraud_reasons))
                THEN array_append(fraud_reasons,$3)
                ELSE fraud_reasons
              END,
              payout_status=CASE
                WHEN $2 <> 'clear' AND payout_status <> 'paid' THEN 'payment_pending'
                ELSE payout_status
              END,
              payout_error=CASE
                WHEN $2 <> 'clear' AND payout_status <> 'paid' THEN 'Payout held for FirstCustomer risk review'
                WHEN $2='clear' AND payout_error LIKE 'Payout held for FirstCustomer risk review%' THEN NULL
                ELSE payout_error
              END
        WHERE id=$1`,
      [id, next, reason],
    );

    await query(
      "INSERT INTO payout_events(conversion_id,event_type,detail) VALUES($1,'risk_status',$2)",
      [id, `${next}${reason ? ` — ${reason}` : ""}`],
    );

    return NextResponse.json({ ok: true, fraudStatus: next });
  }

  if (action !== "retry") return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  if (row.rows[0].payout_status === "paid") return NextResponse.json({ status: "paid" });

  return NextResponse.json(await attemptAutomaticPayout(id));
}
