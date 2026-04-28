const base = require("./index.js");

module.exports = [
  ...base,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
