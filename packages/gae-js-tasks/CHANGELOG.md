# @mondomob/gae-js-tasks

## 10.0.0

### Patch Changes

- Updated dependencies
  - @mondomob/gae-js-core@7.0.0

## 9.3.2

### Patch Changes

- b8da039: Update internal libs to non-breaking latest where applicable

## 9.3.1

### Patch Changes

- e0428bb: Unpin all direct dependency versions

## 9.3.0

### Minor Changes

- 58e50ef: Update dependencies where practical

### Patch Changes

- 4fc4699: Update Typescript to 4.9.3

## 9.2.0

### Minor Changes

- e9d9692: Update dependencies and fix typing issues picked up by typescript 4.8.4

## 9.1.0

### Minor Changes

- 234e7d2: Add support for `inSeconds` for local tasks

## 9.0.0

### Minor Changes

- c867c43: Update to use recommended Node TSConfig settings (for Node 14)

### Patch Changes

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

## 7.0.0

### Major Changes

- 437b763: Peer dependency for @google-cloud/tasks updated to be v3

## 6.0.1

### Patch Changes

- c37b973: Update internal dependencies for vulnerability fixes

## 6.0.0

### Major Changes

- 1d43bc8: Replaced `serviceTasksOnThisVersion` config option with `tasksRoutingVersion` and `tasksRoutingService` options for routing requests to a specific app version or service respectively.

## 5.0.0

### Major Changes

- 1e9a6bd: Remove leading slash from tasks names. We always add a slash so this prevents accidental double slashes in final urls.

### Patch Changes

- Updated dependencies [3b8ae34]
  - @mondomob/gae-js-core@4.0.0

## 4.0.0

### Patch Changes

- Updated dependencies [e2c5732]
- Updated dependencies [98927e8]
- Updated dependencies [0040e76]
  - @mondomob/gae-js-core@3.0.0

## 3.0.0

### Major Changes

- 2a74d7c: Improve typing for task queue service and require payload to extend (object). This is potentially breaking as it allowed any before. Hide internal functions which were accidentally exposed as public previously.

  **Breaking changes**

  - `enqueue` payload must now extend `object` as it converts to a JSON string and was assuming so. If you previously called with a primitive, then wrap in an object.
  - Internal functions for `appEngineQueue` and `localQueue` marked `private` as they are not intended to be called directly.

## 2.0.0

### Major Changes

- bf62e83: BREAKING: gae-js-core `host` and `location` configuration properties are now optional. This may be break typings expecting them to be non-null.
- f62bb4b: Update to new configuration conventions

### Minor Changes

- New `tasksLocation` and `tasksProjectId` configuration properties allow overriding core properties.

### Patch Changes

- e3e7a5f: Update dependencies to latest. Move common dev dependencies to root
- Updated dependencies [e3e7a5f]
- Updated dependencies [cd1b365]
- Updated dependencies [3e56c75]
- Updated dependencies [8eca18c]
- Updated dependencies [c6d48a7]
  - @mondomob/gae-js-core@2.0.0

## 1.0.3

### Patch Changes

- b0ea909: Local task queues now only log task execution errors. This is to prevent local server crashes due to unhandled exceptions.

## 1.0.2

### Patch Changes

- 0f37d07: Minor audit fix for security vulnerabilities. May not even impact bundle, but releasing to be sure.

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
