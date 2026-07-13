import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import Script from "next/script";
import { auth } from "@/app/(auth)/auth";
import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  indexableRobots,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";

import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Juristo AI - Indian Legal AI for Contracts, Case Law & Lawyers",
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Legal Technology",
  alternates: {
    canonical: absoluteUrl("/"),
  },
  robots: indexableRobots,
  openGraph: {
    title: "Juristo AI - Indian Legal AI for Contracts, Case Law & Lawyers",
    description: DEFAULT_DESCRIPTION,
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Juristo AI legal assistant for Indian law",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Juristo AI - Indian Legal AI for Contracts, Case Law & Lawyers",
    description: DEFAULT_DESCRIPTION,
    images: ["/twitter-image.png"],
  },
  icons: {
    icon: "/logo_optimized_30.png",
    shortcut: "/logo_optimized_30.png",
    apple: "/logo_optimized_30.png",
  },
};

const SEO_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl("/juristo-logo.png"),
      email: "info@juristo.in",
      sameAs: ["https://juristo.in"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
      inLanguage: "en-IN",
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "LegalApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description: DEFAULT_DESCRIPTION,
      offers: {
        "@type": "Offer",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
      },
    },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(0 0% 100%)" },
    { media: "(prefers-color-scheme: dark)", color: "hsl(240deg 10% 3.92%)" },
  ],
  colorScheme: "light dark",
};

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

const LIGHT_THEME_COLOR = "hsl(0 0% 100%)";
const DARK_THEME_COLOR = "hsl(240deg 10% 3.92%)";
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${geist.variable} ${geistMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        {/* Preload critical images - CRITICAL for LCP improvement */}
        <link
          rel="preload"
          as="image"
          href="/logo_optimized_30.png"
          type="image/png"
          imageSrcSet="/logo_optimized_30.png"
        />

        {/* Font preloading for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap"
        />

        {/* DNS prefetch for common external resources */}
        <link rel="dns-prefetch" href="https://api.anthropic.com" />
        <link
          rel="dns-prefetch"
          href="https://juristo-prod-bucket.s3.eu-north-1.amazonaws.com"
        />
        <link rel="dns-prefetch" href="https://storage.googleapis.com" />

        {/* Prefetch critical routes on home page for better navigation */}
        <link rel="prefetch" href="/dashboard" as="document" />
        <link rel="prefetch" href="/contracts" as="document" />

        <Script
          id="juristo-seo-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(SEO_SCHEMA),
          }}
        />

        {/* Reduce layout shift during theme change */}
        <Script
          id="theme-color-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-8KTHEXQBS0"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-8KTHEXQBS0');
          `}
        </Script>
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <Suspense fallback={<div />}>
          <AppWrapper>{children}</AppWrapper>
        </Suspense>
        <GoogleAnalytics gaId="G-N0EYFV4F7Y" />
        <Analytics />
      </body>
    </html>
  );
}

async function AppWrapper({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return <Providers session={session}>{children}</Providers>;
}
