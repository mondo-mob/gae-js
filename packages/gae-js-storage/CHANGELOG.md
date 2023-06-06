# @mondomob/gae-js-storage

## 8.1.0

### Minor Changes

- 1f2c09b: Support entire JSON service account key file as storage credentials

## 8.0.1

### Patch Changes

- 410f9b5: Unpin zod version and patch release all libs to force schema regeneration.

## 8.0.0

### Patch Changes

- Updated dependencies
  - @mondomob/gae-js-core@7.0.0

## 7.5.0

### Minor Changes

- c61a49a: Add option to skip default bucket validation. In some cases you may have a bucket where you only have write access. Validating a bucket with exists() requires read. Option allows this check to be skipped.

## 7.4.2

### Patch Changes

- 3df9b6b: FIX: Catch any errors in dangling promise that validates default bucket exists in background. This is meant to be informative in the logs only. Also log info if bucket was validated successfully.

## 7.4.1

### Patch Changes

- b8da039: Update internal libs to non-breaking latest where applicable

## 7.4.0

### Minor Changes

- 7a70b3b: Updated getDefaultBucketResumableUploadUrl to support optional FileOptions parameter

## 7.3.2

### Patch Changes

- 0084fad: Update dependencies

## 7.3.1

### Patch Changes

- 3a7c8ed: Update dependencies

## 7.3.0

### Minor Changes

- 58e50ef: Update dependencies where practical

### Patch Changes

- 4fc4699: Update Typescript to 4.9.3

## 7.2.0

### Minor Changes

- e9d9692: Update dependencies and fix typing issues picked up by typescript 4.8.4
- 26f85b7: Allow specifying projectId in config. Mostly useful for local development where a default project may not be defined.

## 7.1.0

### Minor Changes

- bf18ee1: Add `parseStorageUri` util for parsing gs:// type uri into bucket and object name
- 71c24f6: `defaultBucket` configuration now optional. If not provided StorageService will fallback to `{projectId}.appspot.com`.
- b60b2bf: Update dependencies

## 7.0.0

### Major Changes

- 245a509: BREAKING: All config resides within "storage" object. Replace "storageAbc" config keys with { "storage": { "abc": ...} }.

## 6.0.0

### Minor Changes

- c867c43: Update to use recommended Node TSConfig settings (for Node 14)

### Patch Changes

- Updated dependencies [c3437ca]
- Updated dependencies [c867c43]
- Updated dependencies [0a579c2]
  - @mondomob/gae-js-core@6.0.0

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
      something: t.string,
    }),
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
    something: z.string(),
  });

  // Create ConfigValidator from schema
  const validator = zodValidator(configSchema);
  ```

### Patch Changes

- Updated dependencies [f1766f6]
  - @mondomob/gae-js-core@5.0.0

## 4.1.1

### Patch Changes

- c37b973: Update internal dependencies for vulnerability fixes

## 4.1.0

### Minor Changes

- 40b5a9b: Support providing upload options when creating resumable upload urls

## 4.0.0

### Patch Changes

- Updated dependencies [3b8ae34]
  - @mondomob/gae-js-core@4.0.0

## 3.0.0

### Patch Changes

- Updated dependencies [e2c5732]
- Updated dependencies [98927e8]
- Updated dependencies [0040e76]
  - @mondomob/gae-js-core@3.0.0

## 2.0.0

### Major Changes

- 954c867: BREAKING: `emulatorHost` configuration renamed to `storageEmulatorHost`. Please update configuration accordingly.
- f62bb4b: Update to new configuration conventions

### Minor Changes

- New configuration property `storageOrigin` can be set to define a storage origin used when creating things like upload urls. The core configuration `host` property is used by default (if defined).

### Patch Changes

- e3e7a5f: Update dependencies to latest. Move common dev dependencies to root
- Updated dependencies [e3e7a5f]
- Updated dependencies [cd1b365]
- Updated dependencies [3e56c75]
- Updated dependencies [8eca18c]
- Updated dependencies [c6d48a7]
  - @mondomob/gae-js-core@2.0.0

## 1.3.0

### Minor Changes

- 0a51188: Allow custom no-value error messages on providers and update built-in providers to supply one. Add hasValue method to support checking provider state without throwing errors.

## 1.2.0

### Minor Changes

- 8eece11: Support defining storage client credentials via app configuration. This is useful for local development
  where a service account is required for things like signed urls. Combined with configuration secrets lookup
  this allows connecting using a service account with the key stored in Secrets Manager.

## 1.1.1

### Patch Changes

- 0f37d07: Minor audit fix for security vulnerabilities. May not even impact bundle, but releasing to be sure.

## 1.1.0

### Minor Changes

- implement getDefaultBucketSignedDownloadUrl in storage service

## 1.0.1

### Patch Changes

- 552ecd2: Update dependencies

## 1.0.0

### Major Changes

- 08206d9: Bump all packages to v1.0.0 release. This is mainly to get better semver support - i.e. with versions 0.x.x a minor is considered a major for consumers.

### Patch Changes

- Updated dependencies [6ed9213]
- Updated dependencies [08206d9]
  - @mondomob/gae-js-core@1.0.0

## 0.4.6

### Patch Changes

- Another patch release to test changeset build
- Updated dependencies
  - @mondomob/gae-js-core@0.4.6

## 0.4.5

### Patch Changes

- 023ec3f: Change build to use Typescript project references
- Updated dependencies [023ec3f]
  - @mondomob/gae-js-core@0.4.5

## 0.4.4

### Patch Changes

- 6ec98bd: Use `prepublishOnly` script to trigger build instead of `prepublish` which is no longer run during publish lifecycle in npm 7+
- Updated dependencies [6ec98bd]
  - @mondomob/gae-js-core@0.4.4

## 0.4.3

### Patch Changes

- Removed lerna and replaced with npm workspace and changesets
- Updated dependencies
  - @mondomob/gae-js-core@0.4.3
