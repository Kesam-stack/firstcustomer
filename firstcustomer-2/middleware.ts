import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CANONICAL_HOST } from "@/lib/site";

const legacyHosts = new Set([
  `www.${CANONICAL_HOST}`,
  "firstcustomer-production.up.railway.app",
]);

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === "/api/stripe/webhook" || path === "/api/health") return NextResponse.next();

  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0].trim().toLowerCase();
  if (!legacyHosts.has(host)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.protocol = "https:";
  url.host = CANONICAL_HOST;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon).*)"],
};
