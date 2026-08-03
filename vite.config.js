import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const directApi = (env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  const proxyTarget = (
    env.VITE_API_PROXY_TARGET ||
    env.VITE_API_BASE_URL ||
    `http://localhost:${env.VITE_API_PORT || '3000'}`
  ).replace(/\/+$/, '');

  // When VITE_API_BASE_URL is set, browser talks to API directly (needs CORS).
  // When empty, Vite proxies /api and /uploads → proxyTarget (recommended for localhost).
  const useProxy = !directApi;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@app': path.resolve(__dirname, 'src/app'),
        '@core': path.resolve(__dirname, 'src/core'),
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@modules': path.resolve(__dirname, 'src/modules'),
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
