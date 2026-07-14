const SERVER_FN_FACTORIES = new Set(['createServerFn', 'createServerOnlyFn']);

const MESSAGE =
  'console calls inside a createServerFn/createServerOnlyFn handler run on the server and are ' +
  'not forwarded to Datadog RUM (browser-only). Use the server logger instead.';

function isConsoleCall(callee) {
  return (
    callee?.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'console'
  );
}

// Walks down an a().b().c() chain to find the identifier the chain started from,
// e.g. createServerFn().validator(x).handler(y) -> "createServerFn"
function rootCalleeName(node) {
  let current = node;
  while (current) {
    if (current.type === 'CallExpression') {
      if (current.callee.type === 'Identifier') {
        return current.callee.name;
      }
      if (current.callee.type === 'MemberExpression') {
        current = current.callee.object;
        continue;
      }
      return null;
    }
    if (current.type === 'MemberExpression') {
      current = current.object;
      continue;
    }
    return null;
  }
  return null;
}

function isServerFnHandlerCall(node) {
  return (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'handler' &&
    SERVER_FN_FACTORIES.has(rootCalleeName(node.callee.object))
  );
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow console calls inside TanStack Start createServerFn/createServerOnlyFn handlers'
    },
    schema: [],
    messages: {
      noConsoleInServerFn: MESSAGE
    }
  },
  create(context) {
    const serverHandlerStack = [];

    return {
      CallExpression(node) {
        if (isServerFnHandlerCall(node)) {
          serverHandlerStack.push(node);
        }
        if (serverHandlerStack.length > 0 && isConsoleCall(node.callee)) {
          context.report({ node, messageId: 'noConsoleInServerFn' });
        }
      },
      'CallExpression:exit'(node) {
        if (serverHandlerStack.at(-1) === node) {
          serverHandlerStack.pop();
        }
      }
    };
  }
};
