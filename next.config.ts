import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Permite builds isolados em paralelo (PREVEIA_DIST_DIR=.next-xxx).
  ...(process.env.PREVEIA_DIST_DIR
    ? { distDir: process.env.PREVEIA_DIST_DIR }
    : {}),
  // Evita o Turbopack escolher C:\Users\User por causa de package-lock.json fora do repo.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
