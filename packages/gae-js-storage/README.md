# GAE JS STORAGE

Use Cloud Storage in your app.

## Installation

```sh
npm install @dotrun/gae-js-storage
```

## Components

### StorageProvider
Initialise storage to be accessed elsewhere in your app.

Step 1: Add default bucket to your config

```json
{
  "storageDefaultBucket": "my-test-bucket"
}
```

Step 2: Initialise storage

```
// On app startup
storageProvider.init();
```

Step 3: Use storage

```
// Anywhere in your app
const storage = storageProvider.get();
const [files] = await storage.bucket("some-bucket").getFiles();
```

### StorageService
Helper service for common tasks

```
// Create new service instance
const storageService = new StorageService();

// Create upload url to default bucket
const uploadUrl = storageService.getDefaultBucketResumableUploadUrl("newfile.txt");

// Use default bucket
const [files] = await storageService.defaultBucket.getFiles();
```
