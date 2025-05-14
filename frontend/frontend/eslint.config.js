import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react'; // Добавляем плагин React
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      'plugin:react/recommended', // Добавляем рекомендованные правила для React
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      react, // Добавляем плагин React
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Отключаем правило, требующее импорт React
      'react/jsx-uses-react': 'off', // Отключаем проверку использования React в JSX
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
    settings: {
      react: {
        version: 'detect', // ESLint автоматически определит версию React
      },
    },
  },
);