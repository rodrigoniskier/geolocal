/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Para Vercel serverless
  trailingSlash: true,
  generateEtags: false,
  // Desabilita static export para APIs
  experimental: {
    serverComponentsExternalPackages: ['papaparse']
  }
}

export default nextConfig
