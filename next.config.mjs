/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,  // Enable linting during builds
  },
  typescript: {
    ignoreBuildErrors: false,   // Enable type checking during builds
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
