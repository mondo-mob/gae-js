import { Storage, StorageOptions } from "@google-cloud/storage";
import { GaeJsStorageConfiguration, gaeJsStorageConfigurationSchema } from "../configuration";
import { configurationProvider, gaeJsCoreConfigurationSchema, iots as t, iotsValidator } from "@mondomob/gae-js-core";

export const initTestConfig = async (
  config?: Partial<GaeJsStorageConfiguration>
): Promise<GaeJsStorageConfiguration> => {
  const schema = t.intersection([gaeJsCoreConfigurationSchema, gaeJsStorageConfigurationSchema]);
  process.env.GAEJS_PROJECT = "storage-tests";
  process.env.GAEJS_CONFIG_OVERRIDES = JSON.stringify({
    storageOrigin: "localhost",
    storageDefaultBucket: "test-bucket",
    storageEmulatorHost: "http://localhost:9199",
    ...config,
  });
  await configurationProvider.init({ validator: iotsValidator(schema) });
  return configurationProvider.get<GaeJsStorageConfiguration>();
};

export const connectEmulatorStorage = (settings?: StorageOptions): Storage => {
  return new Storage({
    projectId: "storage-tests",
    apiEndpoint: "localhost:9199",
    credentials: { client_email: "test@example.com", private_key: "{}" },
    ...settings,
  });
};
