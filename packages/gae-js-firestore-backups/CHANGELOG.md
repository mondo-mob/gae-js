# @mondomob/gae-js-firestore-backups

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
