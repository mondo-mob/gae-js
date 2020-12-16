module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier/@typescript-eslint"],
  ignorePatterns: [".eslintrc.js", "jest.config.js", "**/dist/**"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
  },
};
