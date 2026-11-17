import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // Local/manual browsers often hit 127.0.0.1 while `next dev` binds as localhost.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
