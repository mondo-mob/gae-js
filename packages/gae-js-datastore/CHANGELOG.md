# @mondomob/gae-js-datastore

## 10.3.0

### Minor Changes

- 17f6a3b: Stop attempting to rollback a transaction that has already been rolledback due to commit error

## 10.2.1

### Patch Changes

- 2072c07: Update datastore value type to accept an array of values to support IN queries for Firestore in datastore mode

## 10.2.0

### Minor Changes

- datastore repository reindexInBatches() write a log line for every batch of reindex, with option for 'quiet' (no log outputs)

## 10.1.1

### Patch Changes

- 1809bc2: Internal code tidy for reindexInBatches. Should not have material functional effect.

## 10.1.0

### Minor Changes

- 400a0f7: Add reindexInBatches function that performs reindex operation in an efficient manner (using batch sizes of 200 by default) for large datasets. Also FIXES an issue where there was an unbounded Promise.all() in the existing reindex() function that would have caused issues. This now limits to a maximum of 20 promises at any one time.

## 10.0.1

### Patch Changes

- 410f9b5: Unpin zod version and patch release all libs to force schema regeneration.

## 10.0.0

### Patch Changes

- Updated dependencies
  - @mondomob/gae-js-core@7.0.0

## 9.2.3

### Patch Changes

- b8da039: Update internal libs to non-breaking latest where applicable

## 9.2.2

### Patch Changes

- 3a7c8ed: Update dependencies
- e0428bb: Unpin all direct dependency versions

## 9.2.1

### Patch Changes

- 4fc4699: Update Typescript to 4.9.3

## 9.2.0

### Minor Changes

- 8febc1e: Fix support for connecting to non-emulator Datastore instances from outside GCP. Add support for creating DatastoreAdminClients.

## 9.1.0

### Minor Changes

- e9d9692: Update dependencies and fix typing issues picked up by typescript 4.8.4

## 9.0.0

### Minor Changes

- c867c43: Update to use recommended Node TSConfig settings (for Node 14)

### Patch Changes

- c3437ca: Removed io-ts dependencies and all related code. It's recommended to update to use zod instead but any code
  still dependent on io-ts should include `io-ts`, `fp-ts` and `io-ts-reporters` directly. The `iotsValidator`
  code can be taken from the project history.
- Updated dependencies [c3437ca]
- Updated dependencies [c867c43]
- Updated dependencies [0a579c2]
  - @mondomob/gae-js-core@6.0.0

## 8.0.0

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

## 7.0.1

### Patch Changes

- c37b973: Update internal dependencies for vulnerability fixes

## 7.0.0

### Major Changes

- c8609e9: Improve repository typings support for filtering and sorting by nested properties, including those that are nullable.
  Won't be breaking unless you explicitly use the `PropertySort` interface. To upgrade - remove the generic type from the interface.

## 6.0.0

### Patch Changes

- Updated dependencies [3b8ae34]
  - @mondomob/gae-js-core@4.0.0

## 5.2.0

### Minor Changes

- 5205046: Add queryList and queryFirst repository convenience methods

## 5.1.0

### Minor Changes

- 354e1d4: Add DatastoreChildRepository.delete method to allow deleting by parent key and id

## 5.0.1

### Patch Changes

- f892e40: Fix datastore querying by Key value

## 5.0.0

### Major Changes

- f39d0ed: Remove deprecated filter option `hasAnscestor`, use `hasAncestor` instead
- e5b6432: Refactor of repositories to improve support for child entities and allow entities using numeric ids.

  - All repositories now have "byKey" methods. e.g. `getByKey`, `deleteByKey`
  - Repositories can support entities with string and numeric ids
  - `DatastoreKeyRepository` has been renamed `DatastoreChildRepository` to better represent its purpose and
    `parentProperty` configuration is now required.

### Patch Changes

- Updated dependencies [e2c5732]
- Updated dependencies [98927e8]
- Updated dependencies [0040e76]
  - @mondomob/gae-js-core@3.0.0

## 4.1.0

### Minor Changes

- 40bb20c: New function to add post-commit actions to execute after transaction commit, or immediately if there is no current transaction

### Patch Changes

- 734404f: Fix repository indexing/filtering for optional/nullable nested arrays/objects

## 4.0.0

### Major Changes

- f12d04e: Fix so that isTransactionActive() does not error if there is no request storage set. Instead it returns false.

  If you previously depended on an error being thrown this has the potential to be breaking. This also changes `execPostCommit` released in `@mondomob/gae-js-firestore@2.1.0` to be now called `execPostCommit`.

## 3.1.0

### Minor Changes

- 447b80d: Support kindless queries in DataLoader by passing null kind

### Patch Changes

- e6a13c0: Fix bug where storing unindexed Key properties would throw an error

## 3.0.0

### Major Changes

- cff8b92: BREAKING: Allow repository validation using any framework instead of just io-ts
- 03e5172: BREAKING: DatastoreLoader now returns full datastore entity including the Key. All data mapping should happen in repositories.
- bf0f6a7: BREAKING: Add DatastoreKeyRepository to support handling entities with ancestors. This required refactoring the existing code into AbstractRepository. Contract has changed but existing code should work without changes.

### Upgrading

- When instantiating a repository with a schema you must pass a DataValidator instance instead. For io-ts you can use the `iotsValidator` helper.
- Update any direct access to DatastoreLoader with new contract
- Update repository usage to match new contract. Most likely change is to update usages of `repository.key` to `repository.idToKey`.

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
