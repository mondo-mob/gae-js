const base = require("./jest.config.js");

module.exports = {
  ...base,
  globalSetup: "./jest-ci-setup.js",
  globalTeardown: "./jest-ci-teardown.js",
};
