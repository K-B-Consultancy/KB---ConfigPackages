const MESSAGE =
  'Avoid direct query calls in component files. Move data fetching/query logic to a hook or service.';

function isComponentFile(filename) {
  const normalized = filename.replace(/\\/g, '/');
  return (
    normalized.includes('/components/') ||
    normalized.endsWith('.tsx') ||
    normalized.endsWith('.jsx')
  );
}

function isDirectQueryCall(callee) {
  if (!callee) {
    return false;
  }

  if (callee.type === 'Identifier') {
    return callee.name === 'query';
  }

  if (callee.type === 'MemberExpression' && !callee.computed) {
    return callee.property.type === 'Identifier' && callee.property.name === 'query';
  }

  return false;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct query calls in component files'
    },
    schema: [],
    messages: {
      noDirectQueryInComponents: MESSAGE
    }
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (!isComponentFile(filename)) {
      return {};
    }

    return {
      CallExpression(node) {
        if (isDirectQueryCall(node.callee)) {
          context.report({
            node,
            messageId: 'noDirectQueryInComponents'
          });
        }
      }
    };
  }
};
