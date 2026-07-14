import base from './index.js';

/**
 * Next.js flavor of the org base config (see nextjs/RULES.md in KB-Documentation).
 *
 * Append `eslint-config-next` (core-web-vitals + typescript) in the app itself —
 * its version is coupled to the installed Next.js version, so it can't ship here.
 */
export default [
  ...base,
  {
    ignores: ['**/.next/', '**/.turbo/', '**/next-env.d.ts']
  },
  {
    // Next.js framework files are consumed by the framework via default exports
    files: [
      '**/app/**/{page,layout,template,loading,error,not-found,global-error,default,route}.{ts,tsx}',
      '**/app/**/{sitemap,robots,manifest,icon,apple-icon,opengraph-image,twitter-image}.{ts,tsx}',
      '**/middleware.ts',
      '**/instrumentation.ts',
      '**/mdx-components.tsx'
    ],
    rules: {
      'no-restricted-exports': 'off'
    }
  }
];
