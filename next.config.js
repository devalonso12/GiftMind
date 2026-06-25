/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      encoding: false,
      bufferutil: false,
      'utf-8-validate': false,
      ws: false,
      'cross-fetch': false,
      'node-fetch': false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
