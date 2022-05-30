const base = require("../../jest.config.base.js");
const pack = require("./package");

module.exports = {
  ...base,
  displayName: pack.name,
};
