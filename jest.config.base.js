/* eslint-disable no-undef */
module.exports = {
  roots: [
    "<rootDir>/src",
  ],
  "testEnvironment": "node",
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  "testRegex": ".(test|spec).tsx?$",
  "moduleFileExtensions": [
    "js",
    "json",
    "ts",
    "tsx",
  ],
  collectCoverage: true,
  verbose: true
};
