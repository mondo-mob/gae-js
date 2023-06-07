---
"@mondomob/gae-js-storage": major
---

Major refactor to simplify usage and add extra functionality

- Configuration schema updated to remove all service related options. Often multiple storage service instances are required so providing
  application level config for these settings didn't make sense. All service options provided by the old schema can be passed when
  creating the service instances.

- `credentials` option removed from configuration schema. Use `serviceAccountKey` instead.

- Service creation no longer relies on passing `GaeJsStorageConfiguration` instance when overriding settings. Service has its own specific typings.

- References to default bucket removed. The service methods will always apply to a bucket so the default references were confusing.

- Renamed StorageService methods
  - `defaultBucket` -> `getBucket`
  - `getDefaultBucketResumableUploadUrl` -> `getResumableUploadUrl`
  - `getDefaultBucketSignedDownloadUrl` -> `getSignedDownloadUrl`

New functionality

- New StorageService option `bucketNamePrefix` to automatically prefix buckets with the current projectId. This can reduce required configuration for each environment.

- New StorageService methods
  - readFile
  - writeFile
  - copyToBucket
  - copyAllToBucket
  - deleteAll

- New static helper methods
  - toGcsFile
  - toGcsFileIdentifier
  - toGcsUri
  - gcsPathJoin
  - toGcsSaveOptions
  - generateSignedDownloadUrl
  - makePublic
  - makePrivate

Upgrade Instructions:

- If using `credentials` option - migrate to `serviceAccountKey` instead. This means you need to store the full JSON key and not just the private key. e.g. update secret in Cloud Secrets. 

- Remove `defaultBucket`, `origin` and `skipDefaultBucketValidation` from storage configuration. If any of these are required then pass them when creating your StorageService instances. Pass `bucketName`, `origin` and `skipBucketValidation` respectively.
  ```typescript
  export const MyStorageService = new StorageService({
    bucketName: "my-default-bucket",
    origin: "https://my-custom-origin",
    skipBucketValidation: true
  })
  ```

- Update usage of any renamed methods

