// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,

    // 🔥 КЛЮЧЕВОЙ БЛОК — разбиваем на чанки
    rollupOptions: {
      output: {
        manualChunks: {
          // 1. Внешние зависимости — выносим в отдельные чанки
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['react-icons', 'recharts', 'react-quill'],
          utils: ['date-fns', 'date-fns-tz', 'jwt-decode', 'sanitize-html'],
          api: ['./src/services/api'], // твой API-слой

          // 2. Дашборды — выносим полностью (они тяжёлые!)
          admin: ['./src/pages/AdminDashboard'],
          moderator: ['./src/pages/ModeratorDashboard'],
        },
      },
    },

    // Увеличь лимит, чтобы убрать предупреждение (опционально)
    chunkSizeWarningLimit: 1000, // 1 МБ
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  resolve: {
    alias: {
      '@types': resolve(__dirname, 'types/index.ts'),
    },
  },
});