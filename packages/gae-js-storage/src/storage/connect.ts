import { Storage, StorageOptions } from "@google-cloud/storage";
import { configurationProvider, createLogger } from "@dotrun/gae-js-core";
import { GaeJsStorageConfiguration } from "../configuration";

export interface StorageConnectOptions {
  configuration?: GaeJsStorageConfiguration;
  storageOptions?: StorageOptions;
}

export const connectStorage = (options?: StorageConnectOptions): Storage => {
  const logger = createLogger("connectStorage");
  const configuration = options?.configuration || configurationProvider.get<GaeJsStorageConfiguration>();

  logger.info("Initialising Storage");
  const storageSettings: StorageOptions = {
    apiEndpoint: configuration.storageApiEndpoint || undefined,
    ...options?.storageOptions,
  };

  if (configuration.emulatorHost) {
    logger.info(`Using storage emulator: ${configuration.emulatorHost}`);
    process.env.STORAGE_EMULATOR_HOST = configuration.emulatorHost;
  }

  return new Storage(storageSettings);
};
