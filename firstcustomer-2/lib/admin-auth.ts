import crypto from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "fc_admin";
const MAX_AGE = 7 * 24 * 60 * 60;

function clean(value: string | undefined) {
  return (value || "").trim().replace(/^["']|["']$/g, "");
}

function signingSecret() {
  return clean(process.env.FC_ADMIN_SESSION_SECRET)
    || clean(process.env.FC_ADMIN_SECRET)
    || clean(process.env.FC_ADMIN_PASSWORD_HASH)
    || clean(process.env.FC_ADMIN_PASSWORD);
}

export function adminUsername() {
  return clean(process.env.FC_ADMIN_USERNAME);
}

export function adminConfigured() {
  const user = adminUsername();
  const password = clean(process.env.FC_ADMIN_PASSWORD);
  const hash = clean(process.env.FC_ADMIN_PASSWORD_HASH);
  const secret = signingSecret();
  return Boolean(user && secret && (hash.length >= 16 || password.length >= 8));
}

function safeEqualString(a: string, b: string) {
  const key = signingSecret() || "firstcustomer-admin";
  const left = crypto.createHmac("sha256", key).update(a).digest();
  const right = crypto.createHmac("sha256", key).update(b).digest();
  return crypto.timingSafeEqual(left, right);
}

function hexDigest(algorithm: "sha256" | "sha512", value: string) {
  return crypto.createHash(algorithm).update(value, "utf8").digest("hex");
}

function safeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

async function verifyPasswordHash(password: string, hash: string) {
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
    const mod = await import("bcryptjs");
    const bcrypt = mod.default ?? mod;
    return bcrypt.compare(password, hash);
  }

  const normalized = hash.toLowerCase().replace(/^(sha256:|sha256\$|sha-256:)/, "");
  if (normalized.length === 64 && /^[0-9a-f]+$/.test(normalized)) {
    return safeEqualHex(hexDigest("sha256", password), normalized);
  }

  const sha512 = hash.toLowerCase().replace(/^(sha512:|sha512\$|sha-512:)/, "");
  if (sha512.length === 128 && /^[0-9a-f]+$/.test(sha512)) {
    return safeEqualHex(hexDigest("sha512", password), sha512);
  }

  if (/^[0-9a-f]{32}$/i.test(hash)) {
    return safeEqualHex(crypto.createHash("md5").update(password, "utf8").digest("hex"), hash.toLowerCase());
  }

  return false;
}

export async function verifyAdminLogin(username: string, password: string) {
  if (!adminConfigured()) return false;
  if (!safeEqualString(username.trim(), adminUsername())) return false;

  const hash = clean(process.env.FC_ADMIN_PASSWORD_HASH);
  if (hash) return verifyPasswordHash(password, hash);

  const expected = clean(process.env.FC_ADMIN_PASSWORD);
  if (!expected) return false;
  return safeEqualString(password, expected);
}

export function signAdminSession() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = Buffer.from(JSON.stringify({ v: 1, exp, u: adminUsername() })).toString("base64url");
  const sig = crypto.createHmac("sha256", signingSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readAdminSession(token: string | undefined) {
  if (!token || !signingSecret()) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", signingSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { v?: number; exp?: number; u?: string };
    if (data.v !== 1 || !data.exp || data.exp <= Math.floor(Date.now() / 1000)) return false;
    return safeEqualString(data.u || "", adminUsername());
  } catch {
    return false;
  }
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
