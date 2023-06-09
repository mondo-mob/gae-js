# @mondomob/gae-js-firestore

## 16.2.0

### Minor Changes

- 81a9f1f: Add support for collection group queries

  New repository methods `queryGroup`, `queryGroupForIds` and `countGroup` to perform collection group queries against the collection id of the repository.

  e.g. for a repository with collection path of `account/123/transactions`, the collection id is `transactions`. So a collection group query would run against all collections with the id `transactions` - i.e. the transactions from all accounts.

  For this reason it is important to ensure that any collections you wish to use in a collection group query have unique ids.


## 16.1.0

### Minor Changes

- ceb06ea: Add support for OR queries by adding support for Firestore Filter style queries. See README for an example.

## 16.0.1

### Patch Changes

- 410f9b5: Unpin zod version and patch release all libs to force schema regeneration.

## 16.0.0

### Major Changes

- 8ed6698: BREAKING: isFirestoreError was exposing the wrong type from Google libs for checking status code

  Use `GrpcStatus` enum instead of `StatusCode`. Replace references of
  `import { StatusCode } from "@google-cloud/firestore/build/src/status-code";`

  with

  `import { GrpcStatus } from "@google-cloud/firestore";`

## 15.0.0

### Major Changes

- be28a96: BREAKING: delete function no longer accepts varargs. Call with a single id, or an array.

  - Replace `myRepository.delete("id1", "id2")` with `myRepository.delete(["id1", "id2"])`
  - Replace `myRepository.delete(...myArray)` with `myRepository.delete(myArray)`

  New feature to allow Precondition options (https://firebase.google.com/docs/firestore/reference/rest/v1/Precondition) to be specified during delete

  - `myRepository.delete("id1", { exists: true })`. Will fail if "id1" does not exist

## 14.0.0

### Major Changes

- 56fcb3c: Breaking: FirestoreRepository deleteAll() function throws an error by default if called within a transaction. This never actually worked within a transaction and was previously operating outside of the transaction context. There was also a bug where the data loader state was not being cleared and that has now been resolved. If you desperately want the same functionality of deleteAll() executing regardless of the containing transaction for backwards compatibility it is not recommended but you can supply `{ ignoreTransaction: true }`. A better approach would be to enqueue a task with retries.

## 13.0.0

### Patch Changes

- Updated dependencies
  - @mondomob/gae-js-core@7.0.0

## 12.3.0

### Minor Changes

- 65cfed8: FirestoreRepository count() function uses aggregation query to get a count efficiently. See https://firebase.google.com/docs/firestore/query-data/aggregation-queries

## 12.2.0

### Minor Changes

- 2a11a90: Firestore repository queryForIds() returns an array of ids (strings) for the given query using a project query for efficiency. Readme updated with example.

## 12.1.2

### Patch Changes

- b8da039: Update internal libs to non-breaking latest where applicable

## 12.1.1

### Patch Changes

- 454fc54: Fix an issue where our option to skip timestamp updates with DISABLE_TIMESTAMP_UPDATE would fail by not setting createdAt and updatedAt on newly created entities. This flag now only disables overwriting existing updatedAt values. We always need to set these fields for new entities where they don't already have a valid date set for both fields.

## 12.1.0

### Minor Changes

- 16ea678: Allow valueTransformers to be read from sub-classes of FirestoreRepository

## 12.0.2

### Patch Changes

- 0084fad: Update dependencies

## 12.0.1

### Patch Changes

- e0428bb: Unpin all direct dependency versions

## 12.0.0

### Major Changes

- 095a0c3: Query sort supportes nested fields.

  BREAKING: Query `sort` objects have a rename from `property` to `fieldPath`. This allows sorting by nested field paths instead of direct fields only.

  Replace:

  ```typescript
  const results = await repository.query({
    sort: {
      property: "prop1",
      direction: "desc",
    },
  });
  ```

  with

  ```typescript
  const results = await repository.query({
    sort: {
      fieldPath: "prop1",
      direction: "desc",
    },
  });
  ```

  And you also now have the ability to do

  ```typescript
  const results = await repository.query({
    sort: {
      fieldPath: "nested.prop.prop1",
      direction: "desc",
    },
  });
  ```

  Also the underlying type that represents the `sort` property has been renamed from `PropertySort` to `FieldSort` and no longer accepts a generic arg.

## 11.6.1

### Patch Changes

- 6420c57: Slight typing improvement to isFirestoreError helper to tell compiler the assumed interface

## 11.6.0

### Minor Changes

- 58e50ef: Update dependencies where practical

### Patch Changes

- 4fc4699: Update Typescript to 4.9.3

## 11.5.0

### Minor Changes

- ff90af6: Post-commit actions are executed sequentially as this is more predictable for the caller

  - The caller has control over whether to force parallelism by creating a post-commit action with a `Promise.all()` themselves, however each individual action will be called in order
  - This also makes the code more consistent with the branch where it executes "immediately" if you are not within a transaction
  - This fixes an issue where we see `DEADLINE_EXCEEDED` errors in app engine when too many tasks were being enqueued in parallel

## 11.4.1

### Patch Changes

- 9620a50: Remove code duplication and add tests for creating admin client

## 11.4.0

### Minor Changes

- e9d9692: Update dependencies and fix typing issues picked up by typescript 4.8.4
- d4cda1ef: Fix typings issue with latest Firestore SDK

## 11.3.0

### Minor Changes

- 4108374: Mutex service obtain() and release() supports multiple id elements

## 11.2.0

### Minor Changes

- c0bc98d: Fix support for connecting to non-emulator Firestore instances from outside GCP.
  i.e. if you do not specify a `host` in the configuration it will connect to the configured firestore projectId or application projectId.

  Add support for creating FirestoreAdminClients. This is useful for operations such as Document Exports.

## 11.1.1

### Patch Changes

- 74ff6b3: Firestore repository fixes to ensure read/write transformers are applied correctly without affecting search and that mutations return entity/entities with read transformers applied

## 11.1.0

### Minor Changes

- 7a7be1a: Extend repository options to allow for values to be transformed before write or after read. This extends on work to transform dates, but now this also allows us to do arbitrary transformations. This also allows us to use custom date libs (e.g. Luxon) by writing our own version of TimestampedRepository in a repo and changing how transforms happen before write (e.g. convert from DateTime to Timestamp) or after read (e.g. convert from Timestamp to DateTime).

## 11.0.0

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

## 10.0.0

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

## 9.0.0

### Major Changes

- 42784b0: BREAKING: New hook 'afterRead' introduced to allow transformations on data read from Firestore - with default behaviour to convert firestore Timestamps to Dates.
  BREAKING: TimestampedEntity now stores dates as Dates (not strings). Migrate your existing TimestampedEntity docs/entities.
  BREAKING: Mutex now stores dates as Dates (not strings). Purge (or migrate) your existing Mutex docs/entities.
  firestore-repository now accepts a DataValidator to bring it into line with datastore-repository.

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
