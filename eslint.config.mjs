// 🧹 ESLint nach den Regeln des KC Infrastructure Control Center (no-undef, no-unreachable, no-dupe-keys …) plus eslint:recommended.
// Aufruf: npm install, dann npm run lint
import js from "@eslint/js";
import globals from "globals";
export default [
  js.configs.recommended,
  { languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: { ...globals.browser, ...globals.node, ...globals.serviceworker, Deno: "readonly" } },
    rules: { "no-undef": "error", "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrors: "none" }], "no-unreachable": "error", "no-dupe-keys": "error", "no-empty": ["error", { allowEmptyCatch: true }] } },
];
