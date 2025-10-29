import withPWA from "@ducanh2912/next-pwa";

import { NextConfig } from 'next';

const pwaConfig = {
  dest: "public",
  register: true,
  skipWaiting: true,
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'http',
        hostname: 'googleusercontent.com',
      },
    ],
  },
};

export default withPWA(pwaConfig)(nextConfig);