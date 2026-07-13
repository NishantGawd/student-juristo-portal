import type { Metadata } from "next";

export const SITE_NAME = "Juristo AI";
const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://chat.juristo.in";
export const SITE_URL = configuredSiteUrl.replace(/\/$/, "");

export const DEFAULT_DESCRIPTION =
  "Juristo AI helps users research Indian law, draft legal contracts, review documents, study CLAT topics, and connect with verified lawyers.";

export const DEFAULT_KEYWORDS = [
  "Juristo",
  "Juristo AI",
  "Indian legal AI",
  "AI lawyer India",
  "legal AI assistant",
  "contract drafting India",
  "bare acts India",
  "Supreme Court judgements",
  "High Court judgements",
  "CLAT preparation",
  "legal document review",
];

export const indexableRobots: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

export const noIndexRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};

type PageMetadataInput = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
};

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function createPageMetadata({
  title,
  description,
  path = "/",
  keywords = [],
  image = "/opengraph-image.png",
  noIndex = false,
}: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(path);
  const mergedKeywords = Array.from(
    new Set([...keywords, ...DEFAULT_KEYWORDS])
  );

  return {
    title,
    description,
    keywords: mergedKeywords,
    alternates: {
      canonical,
    },
    robots: noIndex ? noIndexRobots : indexableRobots,
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${title} - ${SITE_NAME}`,
        },
      ],
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
