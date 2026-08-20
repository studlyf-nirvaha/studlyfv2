import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', '');
  return {
    envDir: '../',
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
      proxy: {
        '^/(api/.*|generate-portfolio(?:/.*)?|generate-resume(?:/.*)?|update-portfolio(?:/.*)?|generate-summary(?:/.*)?)': {
          target: env.VITE_API_PROXY || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [react()],
    build: {
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000, 
    },
    define: {
      // SECURITY FIX: NEVER expose API keys or secrets in define block
      // ALL API keys are handled ONLY on backend via proxy endpoints
      // Removed: process.env.API_KEY
      // Removed: process.env.GEMINI_API_KEY
      // Removed: ADDITIONAL_CORS_ORIGINS (sensitive infrastructure)
      
      // SAFE: Only public, non-sensitive values
      'import.meta.env.FRONTEND_URL': JSON.stringify(env.FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:3000'),
      'import.meta.env.RENDER_EXTERNAL_URL': JSON.stringify(env.RENDER_EXTERNAL_URL && env.RENDER_EXTERNAL_URL !== 'http://localhost:8000' ? env.RENDER_EXTERNAL_URL : 'https://studlyf-tlkk.onrender.com'),
      'import.meta.env.VITE_ENABLE_ANALYTICS': JSON.stringify(env.VITE_ENABLE_ANALYTICS || 'true'),
      'import.meta.env.VITE_ENABLE_SENTRY': JSON.stringify(env.VITE_ENABLE_SENTRY || 'true')
    },
    esbuild: {
      drop: ['console', 'debugger'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
