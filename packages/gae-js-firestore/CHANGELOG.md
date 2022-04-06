# @mondomob/gae-js-firestore

## 1.2.0

### Minor Changes

- d48ab4c: Add utility function to help detect certain firestore errors (e.g. ALREADY_EXISTS when doing an insert)

## 1.1.0

### Minor Changes

- 3a62199: Add exists() function to repositories to allow simple detection of whether document exists by id

## 1.0.8

### Patch Changes

- 15a59a4: TimestampedRepository newTimestampEntity() helper now populates the timestamp fields with a flag that is replaced on first save.
  This means that createdAt and updatedAt will be the same instant and createdAt will reflect the instant the entity was saved rather
  than when the object was instantiated.

## 1.0.7

### Patch Changes

- 5da774e: Clone documents added to and returned from DataLoader cache. This prevents polluting the
  cache if a caller mutates either the original documents passed to the loader or any document
  returned from the cache.

## 1.0.6

### Patch Changes

- d85c5c6: Store ID as a field on documents as well as the document ref

## 1.0.5

### Patch Changes

- Remember to export TimestampedRepository components

## 1.0.4

### Patch Changes

- 241f0d7: Add TimestampedRepository to auto-update entity timestamps on mutation

## 1.0.3

### Patch Changes

- f328e50: Be more lenient with firestore client peer dependency version

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

## 0.4.7

### Patch Changes

- Another patch release to test changeset build
- Updated dependencies
  - @mondomob/gae-js-core@0.4.6

## 0.4.6

### Patch Changes

- 023ec3f: Change build to use Typescript project references
- Updated dependencies [023ec3f]
  - @mondomob/gae-js-core@0.4.5

## 0.4.5

### Patch Changes

- 6ec98bd: Use `prepublishOnly` script to trigger build instead of `prepublish` which is no longer run during publish lifecycle in npm 7+
- Updated dependencies [6ec98bd]
  - @mondomob/gae-js-core@0.4.4

## 0.4.4

### Patch Changes

- Removed lerna and replaced with npm workspace and changesets
- Updated dependencies
  - @mondomob/gae-js-core@0.4.3
