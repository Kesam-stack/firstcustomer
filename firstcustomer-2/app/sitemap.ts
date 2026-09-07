import type { MetadataRoute } from "next";
import { CANONICAL_ORIGIN } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/explore", "/ledger", "/network", "/create", "/terms", "/privacy"];
  return paths.map((path) => ({
    url: `${CANONICAL_ORIGIN}${path}`,
    changeFrequency: path === "/" ? "hourly" : "weekly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
