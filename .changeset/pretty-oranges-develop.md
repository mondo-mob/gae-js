---
"@mondomob/gae-js-core": major
---

BREAKING: Configuration rewritten to remove dependency on "config" library. Most functionality has not changed but code will need to update to new option naming conventions.

Changes:

- Where possible `projectId` and `environment` will be inferred from the runtime environment. This allows initialising the lib with zero config. 
- There is no default environment (was "development") - for local development you must specify one or rely on project name inference.
- Options can be passed programmatically as well as through environment variables.
- No error is thrown is configuration files do not exist.
- Environment variable names changed:
    - NODE_CONFIG_ENV => GAEJS_CONFIG_ENV - explicitly sets configuration environment
    - NODE_CONFIG_DIR => GAEJS_CONFIG_DIR - sets directory containing configuration files
    - NODE_CONFIG => GAEJS_CONFIG_OVERRIDES - stringified JSON of config values to merge into the configuration
- New environment variable GAEJS_PROJECT - sets the project id the app is running in. Mostly useful for local development/testing.
- Validation can now use any framework. Library provides implementation for io-ts validator.
- Configuration can be loaded multiple times - e.g. with different sources/options.

Upgrading:

Follow these steps to upgrade the configuration to new recommended approach:

- Rename `development.json` to `local.json`
- Remove `projectId` entries from configuration files - this will be set automatically.
- Add environment variable to local development npm script to set project id. Ensure the project has suffix `-local`.
```
  "scripts": {
    ...
    "dev": "GAEJS_PROJECT=gae-js-demo-local nodemon"
  }
```
- Change any usage of environment variables to new names - e.g. most likely in unit tests.
- Update initialisation code to pass validator as a named param.
```typescript
// FROM
await configurationProvider.init(configSchema);

// TO
await configurationProvider.init({ validator: iotsValidator(configSchema) });
```
