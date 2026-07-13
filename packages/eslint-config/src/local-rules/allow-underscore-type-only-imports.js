const UNDERSCORE_IDENTIFIER = /^_[A-Za-z0-9].*/;

function maybeMarkAsUsed(context, name) {
  if (!UNDERSCORE_IDENTIFIER.test(name)) {
    return;
  }

  const markedBySourceCode = context.sourceCode?.markVariableAsUsed?.(name);
  if (markedBySourceCode) {
    return;
  }

  context.markVariableAsUsed?.(name);
}

function getLocalName(node) {
  if (!node || !node.local || node.local.type !== "Identifier") {
    return null;
  }

  return node.local.name;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Allow intentionally underscore-prefixed bindings for type-only import compatibility"
    },
    schema: []
  },
  create(context) {
    return {
      ImportSpecifier(node) {
        const name = getLocalName(node);
        if (name) {
          maybeMarkAsUsed(context, name);
        }
      },
      ImportDefaultSpecifier(node) {
        const name = getLocalName(node);
        if (name) {
          maybeMarkAsUsed(context, name);
        }
      },
      ImportNamespaceSpecifier(node) {
        const name = getLocalName(node);
        if (name) {
          maybeMarkAsUsed(context, name);
        }
      }
    };
  }
};
