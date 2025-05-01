/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
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
  // Configurações experimentais
  experimental: {
    ppr: false,
    // Remover qualquer configuração que possa estar interferindo com o CSS
    optimizeCss: false,
  }
}

export default nextConfig
