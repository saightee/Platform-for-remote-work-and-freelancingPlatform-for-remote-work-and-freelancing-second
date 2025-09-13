// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import path from 'path';

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   base: '/', // Указываем базовый путь для продакшен-сборки
//   build: {
//     outDir: 'dist',
//     assetsDir: 'assets',
//     sourcemap: false, // Отключаем source maps в продакшене для уменьшения размера
//   },
//   server: {
//     host: '0.0.0.0', // Для локальной разработки
//     port: 5173,
//   },
// });

// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// В ESM окружении __dirname недоступен — берём через node:url + node:path
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
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  resolve: {
    alias: {
      // жёстко указываем на ОДИН файл с типами
      '@types': resolve(__dirname, 'types/index.ts'),
    },
  },
});

