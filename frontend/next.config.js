/** @type {import('next').NextConfig} */

// IMPORTANTE: cuando publiques en GitHub Pages, tu sitio vive en
// https://tu-usuario.github.io/nombre-del-repo/  -> por eso necesita basePath.
// En local (docker-compose) NO se usa basePath, por eso solo se activa
// cuando la variable de entorno GITHUB_PAGES=true (ver workflow de deploy).
const isGithubPages = process.env.GITHUB_PAGES === 'true';
const repoName = 'dr-jimenez-platform'; // <-- cambia esto si tu repo se llama distinto

const nextConfig = {
  ...(isGithubPages ? { output: 'export' } : {}),
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
      return [{ source: '/', destination: '/index.html' }];
    },
  } : {}),
};

module.exports = nextConfig;
