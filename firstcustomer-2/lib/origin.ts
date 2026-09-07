import { CANONICAL_ORIGIN } from "@/lib/site";

function requestHost(req: Request) {
  return (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

export function publicOrigin(req: Request) {
  if (process.env.NODE_ENV === "production") return CANONICAL_ORIGIN;

  const host = requestHost(req);
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
