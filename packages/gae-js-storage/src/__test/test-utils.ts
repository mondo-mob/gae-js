import { Storage, StorageOptions } from "@google-cloud/storage";
import { configurationProvider, gaeJsCoreConfigurationSchema, zodValidator } from "@mondomob/gae-js-core";
import { GaeJsStorageConfiguration, gaeJsStorageConfigurationSchema } from "../configuration";

export const initTestConfig = async (
  config?: Partial<GaeJsStorageConfiguration>
): Promise<GaeJsStorageConfiguration> => {
  const schema = gaeJsCoreConfigurationSchema.merge(gaeJsStorageConfigurationSchema);
  process.env.GAEJS_PROJECT = "storage-tests";
  process.env.GAEJS_CONFIG_OVERRIDES = JSON.stringify({
    storage: {
      emulatorHost: "http://127.0.0.1:9199",
    },
    ...config,
  });
  await configurationProvider.init({ validator: zodValidator<GaeJsStorageConfiguration>(schema) });
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
