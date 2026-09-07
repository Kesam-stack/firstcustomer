import { CANONICAL_ORIGIN } from "@/lib/site";

function requestHost(req: Request) {
  return (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

export function publicOrigin(req: Request) {
  const host = requestHost(req);

  if (host === "firstcustomer.xyz" || host === "www.firstcustomer.xyz") return CANONICAL_ORIGIN;

  if (process.env.NODE_ENV === "production") {
    if (host.endsWith(".up.railway.app")) return `https://${host}`;
    return CANONICAL_ORIGIN;
  }

  const proto = (req.headers.get("x-forwarded-proto") || "http").split(",")[0].trim();
  if (host && host !== "localhost" && !host.startsWith("0.0.0.0") && !host.startsWith("[::]") && !host.endsWith(".local")) {
    return `${proto}://${host}`;
  }
  const configured = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  return "http://localhost:3000";
}

export function publicUrl(req: Request, path: string) {
  const origin = publicOrigin(req);
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
