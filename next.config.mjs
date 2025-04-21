/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Garantir que as variáveis de ambiente sejam carregadas
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
}

export default nextConfig
