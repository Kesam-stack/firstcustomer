import crypto from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "fc_admin";
const MAX_AGE = 7 * 24 * 60 * 60;

function signingSecret() {
  return process.env.FC_ADMIN_SECRET || process.env.FC_ADMIN_PASSWORD || "";
}

export function adminConfigured() {
  const password = process.env.FC_ADMIN_PASSWORD || "";
  return password.length >= 8;
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.FC_ADMIN_PASSWORD || "";
  if (!expected || expected.length < 8) return false;
  const secret = signingSecret();
  const a = crypto.createHmac("sha256", secret).update(password).digest();
  const b = crypto.createHmac("sha256", secret).update(expected).digest();
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function signAdminSession() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `v1.${exp}`;
  const sig = crypto.createHmac("sha256", signingSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readAdminSession(token: string | undefined) {
  if (!token || !signingSecret()) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = crypto.createHmac("sha256", signingSecret()).update(payload).digest("base64url");
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const exp = Number(parts[1]);
  return Number.isFinite(exp) && exp > Math.floor(Date.now() / 1000);
}

export function adminCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  };
}

export async function isAdmin() {
  if (!adminConfigured()) return false;
  const jar = await cookies();
  return readAdminSession(jar.get(ADMIN_COOKIE)?.value);
}
