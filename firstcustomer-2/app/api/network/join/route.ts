import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { randomToken, hashToken } from "@/lib/security";
import { requireEmail, requireInt, requireString } from "@/lib/validation";
import { cleanHandle } from "@/lib/format";
import { matchMemberToCampaigns } from "@/lib/network";
import { limitOrThrow } from "@/lib/rateLimit";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";
const allowedCategories = new Set(["All", "Software", "Artificial Intelligence", "Fintech", "Consumer", "Marketplace", "Professional Services", "Other"]);
const allowedChannels = new Set(["X", "LinkedIn", "Newsletter", "Community", "Direct introductions", "YouTube / Podcast"]);

export async function POST(req: Request) {
  try {
    limitOrThrow(req, "network-join", 8);
    const body = await req.json();
    const displayName = requireString(body.displayName, "Name", 80);
    const email = requireEmail(body.email);
    const xHandle = typeof body.xHandle === "string" && body.xHandle.trim() ? cleanHandle(body.xHandle) : null;
    const bio = typeof body.bio === "string" && body.bio.trim() ? requireString(body.bio, "Bio", 280) : null;
    const country = typeof body.country === "string" && body.country.trim() ? requireString(body.country, "Country", 60) : null;
    const audienceSize = requireInt(body.audienceSize ?? 0, "Audience size", 0, 1_000_000_000);
    const categories = Array.isArray(body.categories) ? body.categories.map(String).filter((x: string) => allowedCategories.has(x)).slice(0, 8) : [];
    const channels = Array.isArray(body.channels) ? body.channels.map(String).filter((x: string) => allowedChannels.has(x)).slice(0, 8) : [];
    const emailAlerts = body.emailAlerts !== false;
    if (!categories.length) categories.push("All");

    const exists = await query("SELECT id FROM network_members WHERE lower(email)=lower($1) LIMIT 1", [email]);
    if (exists.rows[0]) return NextResponse.json({ error: "This email is already in the network. Use your original private mission-dashboard link." }, { status: 409 });

    const key = randomToken(28);
    const inserted = await query<{ id: string }>(
      `INSERT INTO network_members(manage_secret_hash,email,x_handle,display_name,bio,categories,channels,audience_size,country,email_alerts)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [hashToken(key), email, xHandle, displayName, bio, categories, channels, audienceSize, country, emailAlerts],
    );
    const id = inserted.rows[0].id;
    const matches = await matchMemberToCampaigns(id);
    return NextResponse.json({ dashboardUrl: siteUrl(`/network/${id}?key=${encodeURIComponent(key)}`), matches: matches.length });
  } catch (error) {
    console.error(error);
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not join the network" }, { status: status === 429 ? 429 : 400 });
  }
}
