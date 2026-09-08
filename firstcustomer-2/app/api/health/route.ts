import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { processDuePayouts } from "@/lib/payouts";

export async function GET() {
  try {
    await query("SELECT 1");
    processDuePayouts(5).catch((error) => console.error("Payout sweep failed", error));
    return NextResponse.json({
      ok: true,
      service: "firstcustomer",
      database: true,
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
      webhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, service: "firstcustomer", database: false }, { status: 503 });
  }
}
