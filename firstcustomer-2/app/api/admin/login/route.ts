import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigured, adminCookieOptions, signAdminSession, verifyAdminPassword } from "@/lib/admin-auth";
import { limitOrThrow } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  try {
    limitOrThrow(req, "admin-login", 8, 15 * 60 * 1000);
    if (!adminConfigured()) {
      return NextResponse.redirect(`${origin}/admin/login?error=config`, 303);
    }
    const form = await req.formData();
    const password = String(form.get("password") || "");
    if (!verifyAdminPassword(password)) {
      return NextResponse.redirect(`${origin}/admin/login?error=1`, 303);
    }
    const res = NextResponse.redirect(`${origin}/admin`, 303);
    res.cookies.set(ADMIN_COOKIE, signAdminSession(), adminCookieOptions());
    return res;
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 400;
    if (status === 429) return NextResponse.redirect(`${origin}/admin/login?error=rate`, 303);
    return NextResponse.redirect(`${origin}/admin/login?error=1`, 303);
  }
}
