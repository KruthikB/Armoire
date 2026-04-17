/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  // Prevent webpack from bundling native Node.js modules used by Neon/ws
  experimental: {
    serverComponentsExternalPackages: [
      "ws",
      "bufferutil",
      "utf-8-validate",
      "@neondatabase/serverless",
      "@prisma/adapter-neon",
    ],
  },
};

module.exports = nextConfig;
