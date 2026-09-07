import { CANONICAL_ORIGIN } from "@/lib/site";

function requestHost(req: Request) {
  return (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

function isPrivateHost(host: string) {
  return !host
    || host.startsWith("0.0.0.0")
    || host.startsWith("[::]")
    || host === "localhost"
    || host.endsWith(".local")
    || host.includes(".railway.internal");
}

export function publicOrigin(req: Request) {
  const host = requestHost(req);
  const proto = (req.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http")).split(",")[0].trim();

  if (host === "www.firstcustomer.xyz" || host === "firstcustomer.xyz") return CANONICAL_ORIGIN;
  if (!isPrivateHost(host)) return `${proto}://${host}`;

  const configured = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return CANONICAL_ORIGIN;
  return "http://localhost:3000";
}

export function publicUrl(req: Request, path: string) {
  const origin = publicOrigin(req);
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
