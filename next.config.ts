import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // 防止构建时静态预渲染 API 路由触发 SQLite 查询（SQLITE_BUSY）
  generateBuildId: async () => "build",
};

export default nextConfig;
