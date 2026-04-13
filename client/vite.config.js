import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(process.cwd(), '..'), '');
  const BASE_URL = env.BASE_URL;
  const PORT = env.PORT;

  return {
    base: BASE_URL,
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      allowedHosts: true,
      port: 5174,
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${PORT}`,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: `http://127.0.0.1:${PORT}`,
          changeOrigin: true,
          secure: false,
        },
        '/static': {
          target: `http://127.0.0.1:${PORT}`,
          changeOrigin: true,
          secure: false,
        },
        '/health': {
          target: `http://127.0.0.1:${PORT}`,
          changeOrigin: true,
          secure: false,
        }
      },
    },
  }
})