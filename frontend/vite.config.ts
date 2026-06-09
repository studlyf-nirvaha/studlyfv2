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
      proxy: {
        '^/(api/.*|generate-portfolio(?:/.*)?|generate-resume(?:/.*)?|update-portfolio(?:/.*)?|generate-summary(?:/.*)?)': {
          target: env.VITE_API_PROXY || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [react()],
    build: {
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000, 
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler') || id.includes('object-assign')) return 'vendor_react';
                if (id.includes('react-router-dom') || id.includes('react-router')) return 'vendor_router';
                if (id.includes('framer-motion')) return 'vendor_framer-motion';
                if (id.includes('lucide-react') || id.includes('react-icons')) return 'vendor_icons';
                if (id.includes('@heroui')) return 'vendor_heroui';
                if (id.includes('html2pdf.js') || id.includes('html2canvas') || id.includes('jspdf')) return 'vendor_pdf';
                if (id.includes('pdfjs-dist')) return 'vendor_pdfjs';
                if (id.includes('react-markdown') || id.includes('remark-gfm') || id.includes('rehype-raw')) return 'vendor_markdown';
                if (id.includes('lottie-react')) return 'vendor_lottie';
                if (id.includes('qrcode')) return 'vendor_qrcode';
                if (id.includes('react-syntax-highlighter')) return 'vendor_syntax';
                if (id.includes('react-helmet-async')) return 'vendor_helmet';
                // Remove return 'vendor_misc' to let Rollup handle remaining dependencies
            }
          }
        }
      }
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''),
      'import.meta.env.FRONTEND_URL': JSON.stringify(env.FRONTEND_URL || process.env.FRONTEND_URL || 'https://studlyfhub.vercel.app'),
      'import.meta.env.RENDER_EXTERNAL_URL': JSON.stringify(env.RENDER_EXTERNAL_URL || process.env.RENDER_EXTERNAL_URL || 'https://studlyf-tlkk.onrender.com'),
      'import.meta.env.ADDITIONAL_CORS_ORIGINS': JSON.stringify(env.ADDITIONAL_CORS_ORIGINS || process.env.ADDITIONAL_CORS_ORIGINS || 'https://studlyf-tlkk.onrender.com')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
