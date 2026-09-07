export function requireString(value: unknown, name: string, max = 240) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  return value.trim().slice(0, max);
}

export function requireEmail(value: unknown) {
  const email = requireString(value, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email");
  return email;
}

export function requireHttpUrl(value: unknown) {
  const raw = requireString(value, "Product URL", 1000);
  const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Product URL must use http or https");
  return url.toString();
}

export function requireInt(value: unknown, name: string, min: number, max: number) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be between ${min} and ${max}`);
  return n;
}

export function optionalXPostUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const url = new URL(value.trim().startsWith("http") ? value.trim() : `https://${value.trim()}`);
  const host = url.hostname.replace(/^www\./, "");
  if (!["x.com", "twitter.com"].includes(host) || !url.pathname.includes("/status/")) {
    throw new Error("X post must be a public status URL, like https://x.com/handle/status/123");
  }
  url.hash = "";
  return url.toString();
}
