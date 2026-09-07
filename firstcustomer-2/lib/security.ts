import crypto from "node:crypto";

export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function safeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
