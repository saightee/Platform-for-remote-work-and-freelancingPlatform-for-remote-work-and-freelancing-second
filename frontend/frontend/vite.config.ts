import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Указываем корневую директорию для Vite
  root: './',
  // Указываем, где искать статические файлы (по умолчанию public/)
  publicDir: 'public',
  // Убедимся, что пути начинаются с корня
  base: '/',
});