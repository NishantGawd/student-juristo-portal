import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

const routes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/contracts", changeFrequency: "daily", priority: 0.9 },
  {
    path: "/contracts/standard-nda",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/contracts/residential-rental-agreement",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  { path: "/legal/bare-acts", changeFrequency: "weekly", priority: 0.85 },
  {
    path: "/legal/judgements/sc",
    changeFrequency: "weekly",
    priority: 0.85,
  },
  {
    path: "/legal/judgements/hc",
    changeFrequency: "weekly",
    priority: 0.85,
  },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
