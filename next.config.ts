import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite builds isolados em paralelo (PREVEIA_DIST_DIR=.next-xxx).
  ...(process.env.PREVEIA_DIST_DIR
    ? { distDir: process.env.PREVEIA_DIST_DIR }
    : {}),
};

export default nextConfig;
