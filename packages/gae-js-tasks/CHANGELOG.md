# @mondomob/gae-js-tasks

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
