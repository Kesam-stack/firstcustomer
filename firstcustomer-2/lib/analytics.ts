import crypto from "node:crypto";

function analyticsSecret() {
  const value = process.env.FC_ANALYTICS_HMAC_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("FC_ANALYTICS_HMAC_SECRET is required in production.");
  }
  return "firstcustomer-development-analytics-secret-change-me";
}

export function analyticsHash(namespace: string, value: string) {
  return crypto
    .createHmac("sha256", analyticsSecret())
    .update(namespace)
    .update("\0")
    .update(value)
    .digest("hex");
}

export function cleanAnalyticsPath(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || !raw.startsWith("/")) return "/";
  const path = raw.split("?")[0].split("#")[0].slice(0, 240);
  if (path.startsWith("/admin") || path.startsWith("/api")) return null;
  return path || "/";
}

export function cleanAnalyticsText(value: unknown, max = 120) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/[\r\n\t]/g, " ").slice(0, max);
  return cleaned || null;
}

export function deviceType(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|kindle/.test(ua)) return "tablet";
  if (/mobi|iphone|android/.test(ua)) return "mobile";
  return "desktop";
}
