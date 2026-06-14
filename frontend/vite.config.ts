import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env from repo root (.env, .env.production, .env.development etc.)
  const env = loadEnv(mode, '../', '');
  const isProd = mode === 'production';

  // In production (Hostinger static), the browser hits the Render API directly.
  // Set VITE_API_BASE_URL in .env.production to your Render URL.
  // In development, leave blank — Vite proxy handles /api/* → localhost:8000.
  const apiBaseUrl = env.VITE_API_BASE_URL || '';

  return {
    envDir: '../',

    // ── Dev Server ──────────────────────────────────────────────────────────
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Proxy only active in local dev; no effect on production build
      proxy: {
        '^/(api/.*|generate-portfolio(?:/.*)?|generate-resume(?:/.*)?|update-portfolio(?:/.*)?|generate-summary(?:/.*)?)': {
          target: env.VITE_API_PROXY || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    plugins: [react()],

    // ── Production Build ────────────────────────────────────────────────────
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Split vendor chunks for better browser caching
          manualChunks: {
            react:    ['react', 'react-dom', 'react-router-dom'],
            ui:       ['framer-motion', 'lucide-react', 'react-icons'],
            three:    ['three', '@react-three/fiber', '@react-three/drei'],
            pdf:      ['jspdf', 'html2canvas', 'pdfjs-dist'],
            markdown: ['react-markdown', 'remark-gfm', 'rehype-raw'],
          },
        },
      },
    },

    // ── Compile-time Env Injection ──────────────────────────────────────────
    define: {
      // SECURITY: No API keys here — all secrets live server-side only.

      // The frontend origin (Hostinger domain)
      'import.meta.env.FRONTEND_URL': JSON.stringify(
        env.FRONTEND_URL || 'https://www.studlyf.in'
      ),

      // Render backend base URL (baked in at build time from .env.production)
      // Update VITE_API_BASE_URL in .env.production once Render URL is known.
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
      'import.meta.env.RENDER_EXTERNAL_URL': JSON.stringify(
        env.RENDER_EXTERNAL_URL || apiBaseUrl || ''
      ),

      'import.meta.env.VITE_ENABLE_ANALYTICS': JSON.stringify(
        env.VITE_ENABLE_ANALYTICS || 'true'
      ),
      'import.meta.env.VITE_ENABLE_SENTRY': JSON.stringify(
        env.VITE_ENABLE_SENTRY || 'true'
      ),
      'import.meta.env.VITE_SUPPORT_EMAIL': JSON.stringify(
        env.VITE_SUPPORT_EMAIL || 'studlyf21@gmail.com'
      ),
    },

    // ── esbuild: strip logs/debugger in production only ─────────────────────
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
