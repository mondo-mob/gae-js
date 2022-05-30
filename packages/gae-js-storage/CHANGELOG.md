# @mondomob/gae-js-storage

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
