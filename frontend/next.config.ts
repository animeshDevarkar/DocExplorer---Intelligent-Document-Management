import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@docexplorer/auth", "@docexplorer/database"],
  async rewrites() {
    const backendUrl = process.env.RENDER_URL || "http://localhost:3001";
    return [
      {
        source: '/api/documents/:path*',
        destination: `${backendUrl}/api/documents/:path*`,
      },
      {
        source: '/api/chat/:path*',
        destination: `${backendUrl}/api/chat/:path*`,
      },
      {
        source: '/api/users/:path*',
        destination: `${backendUrl}/api/users/:path*`,
      },
      {
        source: '/api/ping',
        destination: `${backendUrl}/api/ping`,
      }
    ]
  },
};

export default nextConfig;
