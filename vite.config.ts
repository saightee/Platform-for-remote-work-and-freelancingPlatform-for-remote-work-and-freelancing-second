import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Указываем базовый путь для продакшен-сборки
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Отключаем source maps в продакшене для уменьшения размера
  },
  server: {
    host: '0.0.0.0', // Для локальной разработки
    port: 5173,
  },
});