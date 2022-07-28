# @mondomob/gae-js-firestore

## 8.1.1

### Patch Changes

- c37b973: Update internal dependencies for vulnerability fixes

## 8.1.0

### Minor Changes

- ab273bc: withMutex and withMutexSilent support array of mutex ids when called (or just a plain string as per existing)

## 8.0.1

### Patch Changes

- 640c614: Validate mutex prefixes cannot contain "/" character since these are used to construct an id which cannot contain slashes.

## 8.0.0

### Major Changes

- f89b088: Update mutexService to allow prefix to be defined a single string or string[] and remove redundant option to specify custom separator. To upgrade, replace prefixes option with prefix.

## 7.0.0

### Major Changes

- fada597: Add withMutex and withMutexSilent to wrap a piece of code with mutex obtain and release. Changed shape of config options for `MutexService` slightly. No other breaking changes.

## 6.2.0

### Minor Changes

- 13e7819: Add MutexService as a helper to obtain and release mutexes with a timeout, backed by a firestore collection

## 6.1.0

### Minor Changes

- 6e46015: Add synchronous version of execPostCommitOrNow so callers don't get warnings of unresolved promises when not necessary: execPostCommitOrNowSync

## 6.0.0

### Patch Changes

- Updated dependencies [3b8ae34]
  - @mondomob/gae-js-core@4.0.0

## 5.0.0

### Major Changes

- 780721d: BREAKING: beforePersist is only concerned with a single entity instance and beforePersistBatch is available if you really need to know about the whole OneOrMany

  This change simplifies the implementation in sub-classes, removing the burden for handling one or many.

  To fix: change your `beforePersist` function to only deal with a single entity instance. If you _really_ need to operate on the whole batch you can consider using `beforePersistBatch`.

## 4.1.0

### Minor Changes

- 3fd2029: Create custom sub-type for not found errors to allow easier matching in client codebases

## 4.0.0

### Patch Changes

- 980d78b: Pass explicit id generator function for firestore repository search index preparation
- Updated dependencies [e2c5732]
- Updated dependencies [98927e8]
- Updated dependencies [0040e76]
  - @mondomob/gae-js-core@3.0.0

## 3.0.0

### Major Changes

- f12d04e: Fix so that isTransactionActive() does not error if there is no request storage set. Instead it returns false.

  If you previously depended on an error being thrown this has the potential to be breaking. This also changes `execPostCommit` released in `@mondomob/gae-js-firestore@2.1.0` to be now called `execPostCommit`.

## 2.1.0

### Minor Changes

- 1af3495: New function to add post-commit actions to execute after transaction commit, or immediately if there is no current transaction

## 2.0.0

### Major Changes

- cd1b365: BREAKING: Refactored Repository and SearchRepository from core directly into firestore/datastore libs. Refactor any usage of SearchRepository to use new standard repositories.
- BREAKING: Removed deprecated update and upsert methods from FirestoreRepository. Use save() method instead.
- f62bb4b: Update to new configuration conventions

### Patch Changes

- e3e7a5f: Update dependencies to latest. Move common dev dependencies to root
- Updated dependencies [e3e7a5f]
- Updated dependencies [cd1b365]
- Updated dependencies [3e56c75]
- Updated dependencies [8eca18c]
- Updated dependencies [c6d48a7]
  - @mondomob/gae-js-core@2.0.0

## 1.5.0

### Minor Changes

- c2ba2c4: Deprecated repository "update" methods. Current implementation can produce inconsistent results and Firestore SDK does not provide a way to work with the existing repository contract.
- 6b19e91: Add support for checking if db transaction currently active.
- 0a51188: Allow custom no-value error messages on providers and update built-in providers to supply one. Add hasValue method to support checking provider state without throwing errors.
- 7fdcbd3: Support custom error messages when fetching required items from request storage.

## 1.4.2

### Patch Changes

- Fix typing to allow query projection with **name** and add a constant, FIRESTORE_ID_FIELD to represent **name**

## 1.4.1

### Patch Changes

- Moved test utilities into \_\_test folder for packages

## 1.4.0

### Minor Changes

- 6dd5b3b: Firestore repository improvements

  - getRequired() can accept array of ids to return array of required entities (failing if any not resolved)
  - Fix typing for get(ids: string[]) as entries within can also be null

## 1.3.1

### Patch Changes

- 0f37d07: Minor audit fix for security vulnerabilities. May not even impact bundle, but releasing to be sure.

## 1.3.0

### Minor Changes

- 279ddb0: implement deleteAll on firestore repository

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
