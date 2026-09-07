import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth";
import { publicUrl } from "@/lib/origin";

export async function POST(req: Request) {
  const res = NextResponse.redirect(publicUrl(req, "/admin/login"), 303);
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
