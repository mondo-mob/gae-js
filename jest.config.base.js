/* eslint-disable no-undef */
module.exports = {
  roots: ["<rootDir>/src"],
  setupFiles: ["<rootDir>/src/__test/setup-tests.ts"],
  setupFilesAfterEnv: ["jest-extended/all", "<rootDir>/src/__test/setup-after-env.ts"],
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testRegex: ".(test|spec).tsx?$",
  moduleFileExtensions: ["js", "json", "ts", "tsx"],
  collectCoverage: true,
  verbose: true,
};
