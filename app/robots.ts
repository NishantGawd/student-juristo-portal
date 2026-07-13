import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/contracts",
          "/legal/bare-acts",
          "/legal/judgements/hc",
          "/legal/judgements/sc",
        ],
        disallow: [
          "/api/",
          "/auth/",
          "/chat/",
          "/dashboard",
          "/document/",
          "/live-chat/",
          "/onboarding",
          "/reset-password",
          "/tickets",
          "/vaults",
          "/widget",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
