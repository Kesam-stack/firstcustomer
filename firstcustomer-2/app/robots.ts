import type { MetadataRoute } from "next";
import { CANONICAL_ORIGIN } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/manage", "/referrals"],
    },
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
    host: "firstcustomer.xyz",
  };
}
