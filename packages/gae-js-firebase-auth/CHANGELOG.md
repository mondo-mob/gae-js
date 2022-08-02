# @mondomob/gae-js-firebase-auth

## 6.0.0

### Minor Changes

- c867c43: Update to use recommended Node TSConfig settings (for Node 14)

### Patch Changes

- Updated dependencies [c3437ca]
- Updated dependencies [c867c43]
- Updated dependencies [0a579c2]
  - @mondomob/gae-js-core@6.0.0

## 5.0.0

### Patch Changes

- Updated dependencies [f1766f6]
  - @mondomob/gae-js-core@5.0.0

## 4.0.1

### Patch Changes

- c37b973: Update internal dependencies for vulnerability fixes

## 4.0.0

### Patch Changes

- Updated dependencies [3b8ae34]
  - @mondomob/gae-js-core@4.0.0

## 3.0.0

### Major Changes

- 98927e8: The BaseUser typings have been loosened to provide more compatibility with real user types.

  The default userRequestStorage has been removed. Instead, consumers must initialise the `userRequestStorageProvider` with the app specific user storage.

  ```typescript
  const userStorage = new RequestStorageStore<AppUser>("_APPUSER", appUserSchema);
  ```

### Patch Changes

- Updated dependencies [e2c5732]
- Updated dependencies [98927e8]
- Updated dependencies [0040e76]
  - @mondomob/gae-js-core@3.0.0

## 2.0.0

### Major Changes

- f62bb4b: Update to new configuration conventions

### Patch Changes

- e3e7a5f: Update dependencies to latest. Move common dev dependencies to root
- Updated dependencies [e3e7a5f]
- Updated dependencies [cd1b365]
- Updated dependencies [3e56c75]
- Updated dependencies [8eca18c]
- Updated dependencies [c6d48a7]
  - @mondomob/gae-js-core@2.0.0

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
