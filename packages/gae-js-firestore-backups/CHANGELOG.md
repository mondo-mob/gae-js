# @mondomob/gae-js-firestore-backups

## 8.0.0

### Patch Changes

- 896667b: Update for breaking upstream changes
- Updated dependencies [896667b]
- Updated dependencies [07d88ae]
  - @mondomob/gae-js-bigquery@2.0.0
  - @mondomob/gae-js-storage@9.0.0

## 7.0.1

### Patch Changes

- 410f9b5: Unpin zod version and patch release all libs to force schema regeneration.

## 7.0.0

### Patch Changes

- Updated dependencies [8ed6698]
  - @mondomob/gae-js-firestore@16.0.0

## 6.0.0

### Patch Changes

- 6c57256: Update for upstream breaking changes in gae-js-tasks
- Updated dependencies [2fe4b19]
  - @mondomob/gae-js-tasks@11.0.0

## 5.0.0

### Patch Changes

- Updated dependencies [be28a96]
  - @mondomob/gae-js-firestore@15.0.0

## 4.0.0

### Patch Changes

- Updated dependencies [56fcb3c]
  - @mondomob/gae-js-firestore@14.0.0

## 3.0.0

### Patch Changes

- Updated dependencies
  - @mondomob/gae-js-core@7.0.0
  - @mondomob/gae-js-bigquery@1.0.0
  - @mondomob/gae-js-firestore@13.0.0
  - @mondomob/gae-js-storage@8.0.0
  - @mondomob/gae-js-tasks@10.0.0

## 2.0.3

### Patch Changes

- b8da039: Update internal libs to non-breaking latest where applicable

## 2.0.2

### Patch Changes

- 0084fad: Update dependencies

## 2.0.1

### Patch Changes

- 3a7c8ed: Update dependencies
- e0428bb: Unpin all direct dependency versions

## 2.0.0

### Patch Changes

- Updated dependencies [095a0c3]
  - @mondomob/gae-js-firestore@12.0.0

## 1.1.0

### Minor Changes

- 58e50ef: Update dependencies where practical

### Patch Changes

- 4fc4699: Update Typescript to 4.9.3
- de0e8e9: Update zod to 3.19.1

## 1.0.1

### Patch Changes

- 3d10efa: Fix backup check endpoints not sending response when standard export completes

## 1.0.0

### Minor Changes

- e864741: Use common BigQuery import service from gae-js-bigquery

### Patch Changes

- Updated dependencies [1eac8b4]
  - @mondomob/gae-js-bigquery@0.3.0

## 0.2.0

### Minor Changes

- e9d9692: Update dependencies and fix typing issues picked up by typescript 4.8.4
- 46f4f2ee: Fix typing issues with conflicting versions of google-gax across gcloud sdk libs. i.e. don't import directly
  from google-gax - use types from client lib itself.

### Patch Changes

- Updated dependencies [e9d9692]
  - @mondomob/gae-js-bigquery@0.2.0

## 0.1.0

### Major Changes

- 70253f1: Add new package gae-js-firestore-backups
