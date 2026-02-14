const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  compiler:
    process.env.NODE_ENV === 'production'
      ? {
          removeConsole: {
            exclude: ['error'],
          },
        }
      : undefined,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = withBundleAnalyzer(nextConfig)

