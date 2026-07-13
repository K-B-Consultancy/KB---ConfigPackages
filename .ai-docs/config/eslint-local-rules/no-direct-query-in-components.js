// Org-wide custom rule — canonical implementation (synced from KB-Documentation).
// Do not edit in a client repo; changes arrive via the .ai-docs sync PR.
//
// Enforces the representation/business-logic separation from
// .ai-docs/10-stacks/react-base/RULES.md § Hooks: only files named use*.ts(x)
// may call TanStack Query primitives directly. Components and utilities must
// go through a custom hook.
const QUERY_HOOKS = [
  "useQuery",
  "useQueries",
  "useInfiniteQuery",
  "useSuspenseQuery",
  "useSuspenseQueries",
  "useSuspenseInfiniteQuery",
  "usePrefetchQuery",
  "usePrefetchInfiniteQuery",
  "useMutation",
  "useQueryClient",
];

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct TanStack Query calls outside custom hooks",
    },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename();
    // Allow any file whose basename starts with "use" (case-sensitive)
    if (/\/use[A-Z][^/]*\.[cm]?[jt]sx?$/.test(filename)) return {};

    return {
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          QUERY_HOOKS.includes(node.callee.name)
        ) {
          context.report({
            node,
            message:
              `'${node.callee.name}' must only be called inside a custom hook (use*.ts). ` +
              "Extract the data-fetching logic into a hook and call that hook here instead.",
          });
        }
      },
    };
  },
};
