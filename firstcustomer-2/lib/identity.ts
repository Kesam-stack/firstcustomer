import crypto from "node:crypto";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function secret() {
  const value = process.env.FC_IDENTITY_HMAC_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("FC_IDENTITY_HMAC_SECRET is required in production.");
  }
  return "firstcustomer-development-identity-secret-change-me";
}

function hmac(namespace: string, value: string) {
  return crypto
    .createHmac("sha256", secret())
    .update(namespace)
    .update("\0")
    .update(value)
    .digest("hex");
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isEmailIdentity(value: string) {
  return EMAIL_RE.test(normalizeEmail(value));
}

export function companyIdentityFingerprint(creatorEmail: string, productUrl?: string) {
  if (productUrl) {
    try {
      const host = new URL(productUrl).hostname.toLowerCase().replace(/^www\./, "");
      if (host) return hmac("company", host);
    } catch {}
  }
  return hmac("company", normalizeEmail(creatorEmail));
}

export function referrerIdentityFingerprint(email: string) {
  return hmac("referrer", normalizeEmail(email));
}

export function customerIdentityFingerprint(companyFingerprint: string, customerReference: string) {
  const raw = customerReference.trim().normalize("NFKC");
  const normalized = isEmailIdentity(raw) ? normalizeEmail(raw) : raw;
  return hmac(`customer:${companyFingerprint}`, normalized);
}
