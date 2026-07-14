const MESSAGE =
  'console calls in a Server Component/Route Handler/Server Action are not forwarded to Datadog ' +
  'RUM (browser-only). Use the server logger, or move this code into a "use client" file.';

function isConsoleCall(callee) {
  return (
    callee?.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'console'
  );
}

function hasUseClientDirective(programNode) {
  const first = programNode.body[0];
  return first?.type === 'ExpressionStatement' && first.directive === 'use client';
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow console calls in Next.js files without a "use client" directive (Server Components are the App Router default)'
    },
    schema: [],
    messages: {
      noConsoleOnServer: MESSAGE
    }
  },
  create(context) {
    let isClientFile = false;

    return {
      Program(node) {
        isClientFile = hasUseClientDirective(node);
      },
      CallExpression(node) {
        if (isClientFile) {
          return;
        }
        if (isConsoleCall(node.callee)) {
          context.report({ node, messageId: 'noConsoleOnServer' });
        }
      }
    };
  }
};
