/** @type {import('next').NextConfig} */
const requestedDistDir = process.env.NEXT_DIST_DIR;
const safeDistDir =
  requestedDistDir && requestedDistDir !== ".next-runtime"
    ? requestedDistDir
    : process.env.NODE_ENV === "development"
      ? ".next-dev"
      : ".next-build";

const nextConfig = {
  distDir: safeDistDir,
  reactStrictMode: true,
  experimental: {
    webpackBuildWorker: false
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:3001/api/:path*"
      },
      {
        source: "/socket.io/:path*",
        destination: "http://127.0.0.1:3001/socket.io/:path*"
      }
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
      if (!config.watchOptions) {
        config.watchOptions = {};
      }
      
      const existingIgnored = config.watchOptions.ignored;
      let ignored = [];
      
      if (Array.isArray(existingIgnored)) {
        ignored = existingIgnored;
      } else if (existingIgnored) {
        ignored = [existingIgnored];
      }

      config.watchOptions.ignored = [
        ...ignored,
        "**/.wwebjs_auth/**",
        "**/.wwebjs_cache/**"
      ].filter(Boolean); // Ensure no empty/null values
    }

    return config;
  }
};

module.exports = nextConfig;
