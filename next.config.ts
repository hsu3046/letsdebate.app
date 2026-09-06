import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: false,  // 개발 환경에서 API 중복 호출 방지
};

export default nextConfig;
