const base = require("../../jest.config.base.js");
const pack = require("./package");

module.exports = {
  ...base,
  displayName: pack.name,
  setupFiles: ["<rootDir>/src/__test/setup-tests.ts"],
  setupFilesAfterEnv: ["jest-extended/all", "<rootDir>/src/__test/setup-after-env.ts"],
};
