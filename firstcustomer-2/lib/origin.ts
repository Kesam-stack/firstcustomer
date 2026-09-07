export function publicOrigin(req: Request) {
  const configured = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;

  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0].trim();
  const proto = (req.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http")).split(",")[0].trim();
  const unusable = !host || host.startsWith("0.0.0.0") || host.startsWith("[::]") || host.includes(".railway.internal");
  if (!unusable) return `${proto}://${host}`;

  if (process.env.NODE_ENV === "production") return "https://firstcustomer-production.up.railway.app";
  return new URL(req.url).origin;
}

export function publicUrl(req: Request, path: string) {
  const origin = publicOrigin(req);
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
