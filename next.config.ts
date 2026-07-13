import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas", "canvas", "pdfkit"],
  typescript: {
    ignoreBuildErrors: true,
  },
  // ✅ PERF: Optimize React rendering
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        //https://nextjs.org/docs/messages/next-image-unconfigured-host
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "juristo-prod-bucket.s3.eu-north-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "i.ibb.co",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
    // Optimize image loading for better performance
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Enable compression and optimization
  compress: true,
  // Generate bundle analysis for performance monitoring
  productionBrowserSourceMaps: false,
};

export default nextConfig;
// triggered restart
