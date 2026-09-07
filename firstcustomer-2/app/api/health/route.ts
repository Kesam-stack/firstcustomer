import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    await query("SELECT 1");
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
