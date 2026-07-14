import reactRefresh from 'eslint-plugin-react-refresh';

import base from './index.js';

/**
 * TanStack Start flavor of the org base config (see tanstack-start/RULES.md in
 * KB-Documentation). Pulls in `eslint-plugin-react-refresh` as a direct dependency.
 */
export default [
  ...base,
  {
    ignores: ['**/.output/', '**/.vinxi/', '**/.nitro/', '**/.tanstack/']
  },
  {
    plugins: {
      'react-refresh': reactRefresh
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]
    }
  },
  {
    // Vendored shadcn/ui primitives co-locate components with their variant helpers
    files: ['**/src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off'
    }
  }
];
