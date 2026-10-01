import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // loadEnv reads ALL vars (no VITE_ prefix filter here). FOS_KEY stays server-side.
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.N8N_URL ?? 'http://localhost:5678';
  const key = env.FOS_KEY ?? '';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/fos-api': {
          target,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/fos-api/, '/webhook/fos-api'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (key) proxyReq.setHeader('x-fos-key', key);
            });
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
    },
  };
});
