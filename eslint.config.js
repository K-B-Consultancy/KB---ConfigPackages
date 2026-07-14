import js from '@eslint/js';

export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.pnpm-store/**']
  },
  js.configs.recommended,
  {
    rules: {
      'no-console': 'off'
    }
  },
  {
    files: ['scripts/**'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly'
      }
    }
  }
];
