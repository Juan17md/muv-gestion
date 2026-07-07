import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack tiene mejor HMR que webpack, detecta cambios al instante
  turbopack: {},
};

export default nextConfig;
