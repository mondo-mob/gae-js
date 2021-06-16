import { Storage, StorageOptions } from "@google-cloud/storage";
import { initialiseConfiguration } from "@dotrun/gae-js-core";
import { GaeJsStorageConfiguration, gaeJsStorageConfigurationSchema } from "../configuration";

export const initTestConfig = async (
  config?: Partial<GaeJsStorageConfiguration>
): Promise<GaeJsStorageConfiguration> => {
  process.env.NODE_CONFIG = JSON.stringify({
    projectId: "storage-tests",
    host: "localhost",
    location: "local",
    storageDefaultBucket: "test-bucket",
    storageProjectId: "storage-tests",
    storageApiEndpoint: "http://localhost:9199",
    ...config,
  });
  return initialiseConfiguration(gaeJsStorageConfigurationSchema);
};

export const connectEmulatorStorage = (settings?: StorageOptions): Storage => {
  return new Storage({
    projectId: "storage-tests",
    apiEndpoint: "localhost:9199",
    credentials: { client_email: "test@example.com", private_key: "{}" },
    ...settings,
  });
};
