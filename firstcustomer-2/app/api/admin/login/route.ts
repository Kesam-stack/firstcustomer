import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigured, adminCookieOptions, signAdminSession, verifyAdminLogin } from "@/lib/admin-auth";
import { limitOrThrow } from "@/lib/rateLimit";
import { publicUrl } from "@/lib/origin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    limitOrThrow(req, "admin-login", 8, 15 * 60 * 1000);
    if (!adminConfigured()) {
      return NextResponse.redirect(publicUrl(req, "/admin/login?error=config"), 303);
    }
    const form = await req.formData();
    const username = String(form.get("username") || "");
    const password = String(form.get("password") || "");
    if (!await verifyAdminLogin(username, password)) {
      return NextResponse.redirect(publicUrl(req, "/admin/login?error=1"), 303);
    }
    const res = NextResponse.redirect(publicUrl(req, "/admin"), 303);
    res.cookies.set(ADMIN_COOKIE, signAdminSession(), adminCookieOptions());
    return res;
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 400;
    if (status === 429) return NextResponse.redirect(publicUrl(req, "/admin/login?error=rate"), 303);
    return NextResponse.redirect(publicUrl(req, "/admin/login?error=1"), 303);
  }
}
