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
  }
];
