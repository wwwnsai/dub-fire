import withPWA from "next-pwa";

const pwaConfig = {
  dest: "public",
  register: true,
  skipWaiting: true,
};

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
};

export default withPWA(pwaConfig)(nextConfig);
