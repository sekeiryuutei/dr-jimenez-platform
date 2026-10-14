/** @type {import('next').NextConfig} */

// IMPORTANTE: cuando publiques en GitHub Pages, tu sitio vive en
// https://tu-usuario.github.io/nombre-del-repo/  -> por eso necesita basePath.
// En local (docker-compose) NO se usa basePath, por eso solo se activa
// cuando la variable de entorno GITHUB_PAGES=true (ver workflow de deploy).
const isGithubPages = process.env.GITHUB_PAGES === 'true';
const repoName = 'dr-jimenez-platform'; // <-- cambia esto si tu repo se llama distinto

const nextConfig = {
  // Produccion Docker: standalone adelgaza la imagen. GitHub Pages usa export.
  ...(isGithubPages ? { output: 'export' } : { output: 'standalone' }),
  images: { unoptimized: true },
  basePath: isGithubPages ? `/${repoName}` : '',
  assetPrefix: isGithubPages ? `/${repoName}/` : '',
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubPages ? `/${repoName}` : '',
  },
  // Solo en desarrollo local: "/" te manda al sitio real (public/index.html).
  // No se incluye en el build de GitHub Pages porque "output: export" no soporta rewrites
  // (y ahí no hace falta: el hosting estático ya sirve index.html en la raíz solo).
  ...(!isGithubPages ? {
    async rewrites() {
      return [
        { source: '/', destination: '/index.html' },
        // El panel y el sitio hablan con el backend por el MISMO origen.
        // Asi funciona en LAN, en tunel https (cloudflare) o en cualquier dominio,
        // sin pelear con CORS, puertos ni contenido mixto http/https.
        { source: '/api/:path*', destination: 'http://backend:4000/api/:path*' },
        { source: '/uploads/:path*', destination: 'http://backend:4000/uploads/:path*' },
      ];
    },
  } : {}),
};

module.exports = nextConfig;
