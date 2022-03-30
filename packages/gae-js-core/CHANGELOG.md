# @mondomob/gae-js-core

## 1.1.0

### Minor Changes

- 3a62199: Add exists() function to repositories to allow simple detection of whether document exists by id

## 1.0.6

### Patch Changes

- 410af47: Add isReadonlyArray type guard

## 1.0.4

### Patch Changes

- 2e4b89a: Try reverting fp-ts version to fix deployment issue

## 1.0.3

### Patch Changes

- 552ecd2: Update dependencies

## 1.0.2

### Patch Changes

- d6bd90d: Fix export of AsyncHandler type

## 1.0.1

### Patch Changes

- 8bead9e: Update handleAsync typings to be compatible with Express Handler type

## 1.0.0

### Major Changes

- 08206d9: Bump all packages to v1.0.0 release. This is mainly to get better semver support - i.e. with versions 0.x.x a minor is considered a major for consumers.

### Minor Changes

- 6ed9213: Add support for detecting GCP Cloud Functions environment

## 0.4.6

### Patch Changes

- Another patch release to test changeset build

## 0.4.5

### Patch Changes

- 023ec3f: Change build to use Typescript project references

## 0.4.4

### Patch Changes

- 6ec98bd: Use `prepublishOnly` script to trigger build instead of `prepublish` which is no longer run during publish lifecycle in npm 7+

## 0.4.3

### Patch Changes

- Removed lerna and replaced with npm workspace and changesets
