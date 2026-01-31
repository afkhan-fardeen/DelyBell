/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy API requests to Express server
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
      {
        source: '/admin/api/:path*',
        destination: 'http://localhost:3000/admin/api/:path*',
      },
      {
        source: '/auth/:path*',
        destination: 'http://localhost:3000/auth/:path*',
      },
    ];
  },
  // Allow external images
  images: {
    domains: ['cdn.shopify.com'],
  },
};

module.exports = nextConfig;
