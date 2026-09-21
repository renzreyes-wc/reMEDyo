import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Emits a self-contained server bundle so the Docker image does not need
  // the whole pnpm store copied in.
  output: 'standalone',
  // The web container sits beside the api container in Compose, so the API
  // origin is read from NEXT_PUBLIC_API_URL rather than baked in here.
};

export default nextConfig;
