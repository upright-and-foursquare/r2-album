import type { NextConfig } from "next";

function getR2ImageRemotePatterns(): NonNullable<
  NextConfig["images"]
>["remotePatterns"] {
  const publicUrl = process.env.R2_PUBLIC_URL?.trim();
  if (!publicUrl) return [];

  try {
    const url = new URL(publicUrl);
    const protocol = url.protocol.replace(":", "") as "http" | "https";
    return [{ protocol, hostname: url.hostname, pathname: "/**" }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: getR2ImageRemotePatterns(),
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [256, 384, 480, 640],
  },
};

export default nextConfig;
