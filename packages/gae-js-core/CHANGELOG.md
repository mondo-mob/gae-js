# @mondomob/gae-js-core

## 6.0.0

### Major Changes

- c3437ca: Removed io-ts dependencies and all related code. It's recommended to update to use zod instead but any code
  still dependent on io-ts should include `io-ts`, `fp-ts` and `io-ts-reporters` directly. The `iotsValidator`
  code can be taken from the project history.

### Minor Changes

- c867c43: Update to use recommended Node TSConfig settings (for Node 14)
- 0a579c2: Add `set()` method to LazyProvider. This is useful for manually initialising providers in tests.

## 5.0.0

### Major Changes

- f1766f6: BREAKING: Replace io-ts schemas for config with zod.

  To upgrade, install `zod` and replace your config validators such as

  ```typescript
  // Define the io-ts configuration schema you want to use for your app
  const configSchema = t.intersection([
    // Include the schemas from the libraries you are using
    gaeJsCoreConfigurationSchema,
    gaeJsFirestoreConfigurationSchema,
    // Add the other config properties you need
    t.type({
      something: t.string
    })
  ]);

  // Create ConfigValidator from schema
  const validator = iotsValidator(configSchema);
  ```

  with

  ```typescript
  // Define the zod configuration schema you want to use for your app
  import { z } from "zod";
  // Include the schemas from the libraries you are using (use merge if there are multiple)
  const configSchema = gaeJsCoreConfigurationSchema.merge(gaeJsFirestoreConfigurationSchema).extend({
    // Extend and add your own config
    something: z.string()
  });

  // Create ConfigValidator from schema
  const validator = zodValidator(configSchema);
  ```

## 4.1.1

### Patch Changes

- c37b973: Update internal dependencies for vulnerability fixes

## 4.1.0

### Minor Changes

- 1b29016: Add `routeNotFound` util middleware with common boilerplate to return NotFoundError
- 5edc59c: Add `startServer` util with common boilerplate for starting express server.

### Patch Changes

- 8a4649c: Update dependencies

## 4.0.0

### Major Changes

- 3b8ae34: Renamed `handleAsync` to `asyncMiddleware()` and added new variant `asyncHandler()`, which will NOT call next() for a resolved promise. Update your code to the version to match your expected behaviour.

## 3.0.0

### Major Changes

- 98927e8: The BaseUser typings have been loosened to provide more compatibility with real user types.

  The default userRequestStorage has been removed. Instead, consumers must initialise the `userRequestStorageProvider` with the app specific user storage.

  ```typescript
  const userStorage = new RequestStorageStore<AppUser>("_APPUSER", appUserSchema);
  userRequestStorageProvider.set(userStorage);
  ```

- 0040e76: Remove default search id generator when preparing search index. Consumers must now pass id factory param.

### Minor Changes

- e2c5732: RequestStorageStore can be initialised with a DataValidator which is run whenever a value is set

## 2.1.0

### Minor Changes

- ee968e9: Support passing id generator function to search index preparation

### Patch Changes

- 861a0bc: iotsValidator returns generic error message, so it can be reused in more places that accept validators

## 2.0.3

### Patch Changes

- a38c8d4: Log warning but don't throw error if fallback file doesn't exist

## 2.0.2

### Patch Changes

- 650a06f: Log warning but don't throw error if static folder doesn't exist

## 2.0.1

### Patch Changes

- 81f78be: Local simple logger tweaked to log errors with full stack so it's easier to read and click through in IDE

## 2.0.0

### Major Changes

- 3e56c75: BREAKING: Configuration rewritten to remove dependency on "config" library.
  - Where possible `projectId` and `environment` will be inferred from the runtime environment. This allows initialising the lib with zero config.
  - There is no default environment (was "development") - for local development you must specify one or rely on project name inference.
  - Options can be passed programmatically as well as through environment variables.
  - No error is thrown is configuration files do not exist.
  - Environment variable names changed:
    - `NODE_CONFIG_ENV` => `GAEJS_CONFIG_ENV` - explicitly sets configuration environment
    - `NODE_CONFIG_DIR` => `GAEJS_CONFIG_DIR` - sets directory containing configuration files
    - `NODE_CONFIG` => `GAEJS_CONFIG_OVERRIDES` - stringified JSON of config values to merge into the configuration
  - New environment variable `GAEJS_PROJECT` - sets the project id the app is running in. Mostly useful for local development/testing.
  - Validation can now use any framework. Library provides implementation for io-ts validator.
  - Configuration can be loaded multiple times - e.g. with different sources/options.
- cd1b365: BREAKING: Refactored Repository and SearchRepository from core directly into firestore/datastore libs. Refactor search usage to use standard repositories instead.
- 8eca18c: BREAKING: host and location configuration properties are now optional in the config schema. This may break downstream typings expecting these to be mandatory.
- c6d48a7: BREAKING: Client Runtime Configuration middleware removed. If you need it just pull it from the git history.

#### Upgrading

Follow these steps to upgrade the configuration to new recommended approach:

- Rename `development.json` to `local.json`
- Remove `projectId` entries from configuration files - this will be set automatically.
- Add environment variable to local development npm script to set the project. Ensure the project has suffix `-local`.

  ```
    "scripts": {
      ...
      "dev": "GAEJS_PROJECT=gae-js-demo-local nodemon"
    }
  ```

- Change any usage of environment variables to new names - e.g. `NODE_CONFIG_ENV` to `GAEJS_CONFIG_ENV`. This is most likely in unit tests.
- Update initialisation code to create validator and pass as a named param.

  ```typescript
  // FROM
  await configurationProvider.init(configSchema);

  // TO
  await configurationProvider.init({ validator: iotsValidator(configSchema) });
  ```

### Patch Changes

- e3e7a5f: Update dependencies to latest. Move common dev dependencies to root

## 1.6.0

### Minor Changes

- 0a51188: Allow custom no-value error messages on providers and update built-in providers to supply one. Add hasValue method to support checking provider state without throwing errors.
- 7fdcbd3: Support custom error messages when fetching required items from request storage.

## 1.5.0

### Minor Changes

- 262e0b4: Update custom HTTP error classes to accept error code

## 1.4.1

### Patch Changes

- 844344b: Disable strict mode for node-config package to improve support for testing

## 1.4.0

### Minor Changes

- Created @mondomob/gae-js-migrations module to run and bootstrap migrations

## 1.3.0

### Minor Changes

- 1daca49: Use simple text console logging when running locally

## 1.2.1

### Patch Changes

- 0f37d07: Minor audit fix for security vulnerabilities. May not even impact bundle, but releasing to be sure.

## 1.2.0

### Minor Changes

- 46ff773: Add gaeJsCron middleware to verify headers and set timeout to 10 mins (like the task one does)

## 1.1.1

### Patch Changes

- 4cf13bd: fix usage of array spread operator in proxy logger to fix empty array being appended to all log messages

## 1.1.0

### Minor Changes

- 3a62199: Add exists() function to repositories to allow simple detection of whether document exists by id

## 1.0.6

### Patch Changes

- 410af47: Add isReadonlyArray type guard

## 1.0.4

### Patch Changes

- 2e4b89a: Try reverting fp-ts version to fix deployment issue

## 1.0.3

### Patch Changes

- 552ecd2: Update dependencies

## 1.0.2

### Patch Changes

- d6bd90d: Fix export of AsyncHandler type

## 1.0.1

### Patch Changes

- 8bead9e: Update asyncMiddleware typings to be compatible with Express Handler type

## 1.0.0

### Major Changes

- 08206d9: Bump all packages to v1.0.0 release. This is mainly to get better semver support - i.e. with versions 0.x.x a minor is considered a major for consumers.

### Minor Changes

- 6ed9213: Add support for detecting GCP Cloud Functions environment

## 0.4.6

### Patch Changes

- Another patch release to test changeset build

## 0.4.5

### Patch Changes

- 023ec3f: Change build to use Typescript project references

## 0.4.4

### Patch Changes

- 6ec98bd: Use `prepublishOnly` script to trigger build instead of `prepublish` which is no longer run during publish lifecycle in npm 7+

## 0.4.3

### Patch Changes

- Removed lerna and replaced with npm workspace and changesets
