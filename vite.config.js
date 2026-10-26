import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs/promises';
import zlib from 'zlib';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);

/**
 * Writes `.br` + `.gz` siblings for built JS/CSS so Apache (.htaccess) can serve them
 * without relying on mod_deflate being enabled on the shared host.
 */
function precompressAssets() {
  let outDir = 'dist';
  return {
    name: 'karam-precompress-assets',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const assetsDir = path.join(outDir, 'assets');
      let files = [];
      try {
        files = await fs.readdir(assetsDir);
      } catch {
        return;
      }
      await Promise.all(
        files
          .filter((f) => /\.(js|css|svg|json)$/i.test(f))
          .map(async (f) => {
            const file = path.join(assetsDir, f);
            const source = await fs.readFile(file);
            if (source.length < 1024) return;
            const [gz, br] = await Promise.all([
              gzip(source, { level: 9 }),
              brotli(source, {
                params: {
                  [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
                  [zlib.constants.BROTLI_PARAM_SIZE_HINT]: source.length,
                },
              }),
            ]);
            await Promise.all([fs.writeFile(`${file}.gz`, gz), fs.writeFile(`${file}.br`, br)]);
          })
      );
    },
  };
}

/**
 * index.html placeholders:
 *   %KARAM_API_BASE%     → API base used by the early-fetch script (`https://api…/api` or `/api`)
 *   <!-- karam:preconnect --> → preconnect hints for the API / media host
 */
function injectApiHints({ apiBase, origins }) {
  return {
    name: 'karam-api-hints',
    transformIndexHtml(html) {
      const hints = origins
        .flatMap((origin) => [
          `<link rel="preconnect" href="${origin}" crossorigin />`,
          `<link rel="preconnect" href="${origin}" />`,
          `<link rel="dns-prefetch" href="${origin}" />`,
        ])
        .join('\n    ');
      return html
        .replace('<!-- karam:preconnect -->', hints)
        .replaceAll('%KARAM_API_BASE%', apiBase);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const directApi = (env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  const mediaOrigin = (env.VITE_MEDIA_BASE_URL || directApi).replace(/\/+$/, '');
  const proxyTarget = (
    env.VITE_API_PROXY_TARGET ||
    (env.VITE_API_PORT ? `http://localhost:${env.VITE_API_PORT}` : '') ||
    'https://api.karamstore.ly'
  ).replace(/\/+$/, '');

  // Empty VITE_API_BASE_URL = browser → /api → Vite proxy → proxyTarget
  // Set VITE_API_BASE_URL for production builds / direct browser→API
  const useProxy = !directApi;

  return {
    plugins: [
      react(),
      injectApiHints({
        apiBase: directApi ? `${directApi}/api` : '/api',
        origins: [...new Set([directApi, mediaOrigin].filter(Boolean))],
      }),
      precompressAssets(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@app': path.resolve(__dirname, 'src/app'),
        '@core': path.resolve(__dirname, 'src/core'),
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@modules': path.resolve(__dirname, 'src/modules'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Vendor code changes rarely — separate files stay cached across deploys
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[\\/]/.test(id)) {
              return 'vendor-react';
            }
            if (/[\\/]node_modules[\\/](@tanstack|axios|react-hot-toast|goober)[\\/]/.test(id)) {
              return 'vendor-data';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: useProxy
        ? {
            '/api': {
              target: proxyTarget,
              changeOrigin: true,
              secure: true,
            },
            '/uploads': {
              target: proxyTarget,
              changeOrigin: true,
              secure: true,
            },
          }
        : undefined,
    },
  };
});
