import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_BACKEND_URL || 'http://65.1.213.79:5000';

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        // Proxy all /api requests to the Wallnut Node.js backend
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
})

