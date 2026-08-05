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
};

module.exports = nextConfig;
