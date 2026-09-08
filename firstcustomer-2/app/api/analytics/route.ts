import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { analyticsHash, cleanAnalyticsPath, cleanAnalyticsText, deviceType } from "@/lib/analytics";
import { limitOrThrow } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    limitOrThrow(req, "analytics", 180, 60 * 60 * 1000);
    const body = await req.json();
    const path = cleanAnalyticsPath(body.path);
    if (!path) return NextResponse.json({ ok: true });

    const visitorId = cleanAnalyticsText(body.visitorId, 100);
    const sessionId = cleanAnalyticsText(body.sessionId, 100);
    if (!visitorId || !sessionId) return NextResponse.json({ ok: false }, { status: 400 });

    const referrerHost = cleanAnalyticsText(body.referrerHost, 160);
    const referrerPath = cleanAnalyticsPath(body.referrerPath);
    const utmSource = cleanAnalyticsText(body.utmSource, 80);
    const utmMedium = cleanAnalyticsText(body.utmMedium, 80);
    const utmCampaign = cleanAnalyticsText(body.utmCampaign, 120);

    await query(
      `INSERT INTO analytics_events(
          event_type,path,visitor_hash,session_hash,referrer_host,referrer_path,
          utm_source,utm_medium,utm_campaign,device_type
        )
        VALUES('page_view',$1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        path,
        analyticsHash("visitor", visitorId),
        analyticsHash("session", sessionId),
        referrerHost,
        referrerPath,
        utmSource,
        utmMedium,
        utmCampaign,
        deviceType(req.headers.get("user-agent") || ""),
      ],
    );
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 400;
    if (status !== 429) console.error("analytics", error);
    return NextResponse.json({ ok: false }, { status: status === 429 ? 429 : 400 });
  }
}
