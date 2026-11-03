import type { NextConfig } from "next";

const remotePatterns: any[] = [];

// Helper to extract hostname, protocol, and port from a URL string
function addRemotePattern(urlStr: string | undefined) {
  if (!urlStr) return;
  try {
    const url = new URL(urlStr);
    remotePatterns.push({
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      port: url.port || undefined,
      pathname: "/uploads/**",
    });
  } catch (err) {
    // Ignore invalid URLs
  }
}

// Add local and production backend hosts to whitelist
addRemotePattern(process.env.BACKEND_INTERNAL_URL);
addRemotePattern(process.env.NEXT_PUBLIC_API_URL);
addRemotePattern(process.env.SITE_URL);
// addRemotePattern("http://localhost:4001");
addRemotePattern("https://manufactured-smoke-terms-compounds.trycloudflare.com");

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${process.env.BACKEND_INTERNAL_URL || "https://manufactured-smoke-terms-compounds.trycloudflare.com"}/uploads/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      // Hemanta drop slug normalization (2026-05-02). The two `*-diffuser-set`
      // slugs may have been linked from social posts before the rename to the
      // canonical `hemanta-*` form; keep both URLs reachable via 308.
      {
        source: "/shop/hemanta-ispani-diffuser-set",
        destination: "/shop/hemanta-ispani",
        permanent: true,
      },
      {
        source: "/shop/hemanta-rishi-diffuser-set",
        destination: "/shop/hemanta-rishi-diffuser",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
