import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimisation production
  compress: true,
  poweredByHeader: false,
  
  // Variables d'environnement
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  
  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Redirections
  async redirects() {
    return [
      // Redirections désactivées pour permettre l'accès aux pages premium
      // {
      //   source: '/dashboard',
      //   destination: '/',
      //   permanent: false,
      // },
    ];
  },
  
  // Images externes autorisées
  images: {
    domains: ['images.unsplash.com', 'media.api-sports.io'],
    formats: ['image/webp', 'image/avif'],
  },
};

export default nextConfig;
