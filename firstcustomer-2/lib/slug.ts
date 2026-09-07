import crypto from "node:crypto";

export function slugify(input: string) {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "bounty";
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

export function referralCode() {
  return crypto.randomBytes(5).toString("base64url").replace(/[-_]/g, "").slice(0, 8);
}
