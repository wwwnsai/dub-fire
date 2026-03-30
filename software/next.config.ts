// import withPWA from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

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
  },
  trailingSlash: false,
};

// export default withPWA({
//   dest: "public",
//   register: true,

//   customWorkerSrc: "worker/index",
// })(nextConfig);

export default nextConfig;