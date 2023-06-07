import { GaeJsStorageConfiguration } from "../configuration";
import { initTestConfig } from "./test-utils";
import { storageProvider } from "../storage";

export const emptyBucket = async (bucketName: string): Promise<void> => {
  const bucket = await storageProvider.get().bucket(bucketName);
  const [files] = await bucket.getFiles();
  for (const file of files) {
    await file.delete();
  }
};

export const emptyBuckets = async (bucketNames: string[]): Promise<void> => {
  for (const name of bucketNames) {
    await emptyBucket(name);
  }
};

export interface StorageTestOptions {
  config?: Partial<GaeJsStorageConfiguration>;
  clearBuckets?: string[];
  clearBefore?: boolean;
  clearAfter?: boolean;
}

export const useStorageTest = ({
  config: configOverrides,
  clearBuckets = [],
  clearBefore = true,
  clearAfter = false,
}: StorageTestOptions = {}) => {
  beforeAll(async () => {
    await initTestConfig(configOverrides);
    storageProvider.init();
  });

  beforeEach(async () => {
    if (clearBefore) {
      await emptyBuckets(clearBuckets);
    }
  });

  afterEach(async () => {
    if (clearAfter) {
      await emptyBuckets(clearBuckets);
    }
  });
};
