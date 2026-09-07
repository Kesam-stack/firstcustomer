import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { config } from "@/lib/config";

export async function GET() {
  try {
    const database = await query<{ now: string }>("SELECT NOW()::text now");
    return NextResponse.json({
      ok: true,
      service: "firstcustomer",
      database: { ok: true, at: database.rows[0]?.now || null },
      payments: { stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY), webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET) },
      network: { emailAlertsConfigured: Boolean(process.env.RESEND_API_KEY), notificationLimit: config.networkNotificationLimit },
      economics: { launchFeeCents: config.launchFeeCents, platformFeeBps: config.platformFeeBps, minimumRewardCents: config.minimumRewardCents },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, service: "firstcustomer", database: { ok: false } }, { status: 503 });
  }
}
