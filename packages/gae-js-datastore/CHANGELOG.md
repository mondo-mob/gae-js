# @mondomob/gae-js-datastore

## 2.2.0

### Minor Changes

- c367c35: Deprecated hasAnscestor query option in favour of correctly spelled hasAncestor

### Patch Changes

- c40dd29: Fix typings to allow querying by optional array property

## 2.1.0

### Minor Changes

- 59395f6: Support fetching document keys in projection queries
- 7c1302d: Make DatastoreRepository schema validation optional
- c3d4e9c: Allow DataRepository.getRequired() to accept array of ids
- d5db4e7: Add TimestampedRepository to support auto-updating entity timestamps on mutation

### Patch Changes

- 47ca88a: Fix typings for DatastoreRepository.get() when called with array

## 2.0.0

### Major Changes

- cd1b365: BREAKING: Refactored Repository and SearchRepository from core directly into firestore/datastore libs.
- f62bb4b: Update to new configuration conventions

### Patch Changes

- e3e7a5f: Update dependencies to latest. Move common dev dependencies to root
- Updated dependencies [e3e7a5f]
- Updated dependencies [cd1b365]
- Updated dependencies [3e56c75]
- Updated dependencies [8eca18c]
- Updated dependencies [c6d48a7]
  - @mondomob/gae-js-core@2.0.0

## 1.2.0

### Minor Changes

- 6b19e91: Add support for checking if db transaction currently active.
- 0a51188: Allow custom no-value error messages on providers and update built-in providers to supply one. Add hasValue method to support checking provider state without throwing errors.
- 7fdcbd3: Support custom error messages when fetching required items from request storage.

## 1.1.1

### Patch Changes

- 0f37d07: Minor audit fix for security vulnerabilities. May not even impact bundle, but releasing to be sure.

## 1.1.0

### Minor Changes

- d55b7d9: Add exists() function implemenntation to match repository interface update

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
