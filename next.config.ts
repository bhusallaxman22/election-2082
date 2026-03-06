import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets-generalelection2082.ekantipur.com",
      },
      {
        protocol: "https",
        hostname: "election.onlinekhabar.com",
      },
    ],
  },
};

export default nextConfig;
