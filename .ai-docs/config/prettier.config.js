// Org-wide Prettier config — the canonical form of
// .ai-docs/10-stacks/react-base/RULES.md § Prettier. Synced from KB-Documentation;
// do not edit in a client repo — changes arrive via the .ai-docs sync PR.
//
// Wire it up in the monorepo-root prettier.config.js:
//
//   export { default } from "./.ai-docs/config/prettier.config.js";
export default {
  semi: true,
  trailingComma: "all",
  singleQuote: true,
  printWidth: 150,
  tabWidth: 2,
  endOfLine: "lf",
};
