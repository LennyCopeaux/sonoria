/** Base ESLint flat config for the Sonoria monorepo. */
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const sonarjs = require("eslint-plugin-sonarjs");
const unicorn = require("eslint-plugin-unicorn");
const perfectionist = require("eslint-plugin-perfectionist");
const stylistic = require("@stylistic/eslint-plugin");
const prettier = require("eslint-config-prettier");

module.exports = [
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      sonarjs,
      unicorn,
      perfectionist,
      "@stylistic": stylistic,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "sonarjs/no-duplicate-string": "warn",
      "sonarjs/cognitive-complexity": ["warn", 20],
      "unicorn/filename-case": [
        "warn",
        { cases: { kebabCase: true, pascalCase: true } },
      ],
      "unicorn/prefer-node-protocol": "warn",
      "unicorn/no-null": "off",
      "unicorn/prevent-abbreviations": "off",
      "perfectionist/sort-imports": [
        "warn",
        { type: "natural", order: "asc" },
      ],
      "@stylistic/semi": ["warn", "always"],
      "@stylistic/quotes": ["warn", "double", { avoidEscape: true }],
    },
  },
  prettier,
  {
    ignores: [
      "dist/**",
      "build/**",
      ".next/**",
      "node_modules/**",
      "coverage/**",
    ],
  },
];
