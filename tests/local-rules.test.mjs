import test from 'node:test';
import { RuleTester } from 'eslint';

import noDirectQueryInComponents from '../packages/eslint-config/src/local-rules/no-direct-query-in-components.js';
import allowUnderscoreTypeOnlyImports from '../packages/eslint-config/src/local-rules/allow-underscore-type-only-imports.js';
import noConsoleInServerComponents from '../packages/eslint-config/src/local-rules/no-console-in-server-components.js';
import noConsoleInServerFunctions from '../packages/eslint-config/src/local-rules/no-console-in-server-functions.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } }
  }
});

test('local/no-direct-query-in-components', () => {
  ruleTester.run('no-direct-query-in-components', noDirectQueryInComponents, {
    valid: [
      { code: 'query();', filename: 'useUsers.ts' },
      { code: 'db.query();', filename: 'useUsers.ts' },
      { code: 'doSomethingElse();', filename: 'components/Button.tsx' }
    ],
    invalid: [
      {
        code: 'query();',
        filename: 'components/Button.tsx',
        errors: [{ messageId: 'noDirectQueryInComponents' }]
      },
      {
        code: 'db.query();',
        filename: 'Widget.tsx',
        errors: [{ messageId: 'noDirectQueryInComponents' }]
      }
    ]
  });
});

test('local/allow-underscore-type-only-imports', () => {
  ruleTester.run('allow-underscore-type-only-imports', allowUnderscoreTypeOnlyImports, {
    valid: ["import { _Foo } from 'foo';", "import _Bar from 'bar';"],
    invalid: []
  });
});

test('local/no-console-in-server-components', () => {
  ruleTester.run('no-console-in-server-components', noConsoleInServerComponents, {
    valid: ["'use client';\nconsole.log('client');", "'use client';\nconsole.error('client');"],
    invalid: [
      {
        code: "console.log('server');",
        errors: [{ messageId: 'noConsoleOnServer' }]
      },
      {
        // "use server" files (Server Actions) have no "use client" directive either
        code: "'use server';\nconsole.log('server action');",
        errors: [{ messageId: 'noConsoleOnServer' }]
      }
    ]
  });
});

test('local/no-console-in-server-functions', () => {
  ruleTester.run('no-console-in-server-functions', noConsoleInServerFunctions, {
    valid: [
      "console.log('component render');",
      "createClientOnlyFn(() => console.log('client only')).handler;",
      "createServerFn().someOtherMethod(() => console.log('not a handler call'));"
    ],
    invalid: [
      {
        code: "createServerFn().handler(() => console.log('server'));",
        errors: [{ messageId: 'noConsoleInServerFn' }]
      },
      {
        code: "createServerOnlyFn().handler(() => console.log('server only'));",
        errors: [{ messageId: 'noConsoleInServerFn' }]
      },
      {
        code: "createServerFn().validator(v => v).handler(() => console.log('chained'));",
        errors: [{ messageId: 'noConsoleInServerFn' }]
      }
    ]
  });
});
