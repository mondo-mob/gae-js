# @mondomob/gae-js-migrations

## 7.0.0

### Patch Changes

- fada597: Add withMutex and withMutexSilent to wrap a piece of code with mutex obtain and release. Changed shape of config options slightly.
- Updated dependencies [fada597]
  - @mondomob/gae-js-firestore@7.0.0

## 6.0.1

### Patch Changes

- 13e7819: Add MutexService as a helper to obtain and release mutexes with a timeout, backed by a firestore collection

## 6.0.0

### Patch Changes

- Updated dependencies [3b8ae34]
  - @mondomob/gae-js-core@4.0.0
  - @mondomob/gae-js-firestore@6.0.0

## 5.0.0

### Patch Changes

- Updated dependencies [780721d]
  - @mondomob/gae-js-firestore@5.0.0

## 4.0.0

### Patch Changes

- Updated dependencies [e2c5732]
- Updated dependencies [98927e8]
- Updated dependencies [980d78b]
- Updated dependencies [0040e76]
  - @mondomob/gae-js-core@3.0.0
  - @mondomob/gae-js-firestore@4.0.0

## 3.0.0

### Patch Changes

- Updated dependencies [f12d04e]
  - @mondomob/gae-js-firestore@3.0.0

## 2.0.0

### Major Changes

- cd1b365: BREAKING: Refactored Repository and SearchRepository from core directly into firestore/datastore libs.
- BREAKING: Removed update and upsert methods from FirestoreRepository
- f62bb4b: Update to new configuration conventions

### Patch Changes

- e3e7a5f: Update dependencies to latest. Move common dev dependencies to root
- Updated dependencies [e3e7a5f]
- Updated dependencies [cd1b365]
- Updated dependencies [3e56c75]
- Updated dependencies [8eca18c]
- Updated dependencies [f62bb4b]
- Updated dependencies [c6d48a7]
  - @mondomob/gae-js-core@2.0.0
  - @mondomob/gae-js-firestore@2.0.0

## 1.1.2

### Patch Changes

- Updated migrations logger and mutex id

## 1.1.1

### Patch Changes

- Moved test utilities into \_\_test folder for packages

## 1.1.0

### Minor Changes

- Created @mondomob/gae-js-migrations module to run and bootstrap migrations
