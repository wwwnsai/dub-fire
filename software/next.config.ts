// import withPWA from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "http",
        hostname: "googleusercontent.com",
      },
    ],
    domains: ["kxlqevwmzpeekltblgbf.supabase.co"],
  },
  trailingSlash: false,
};

export default nextConfig;

// export default withPWA({
//   dest: "public",
//   disable: !isProd,
//   register: isProd,
//   customWorkerSrc: "worker",
// })(nextConfig);
