import { Storage, StorageOptions } from "@google-cloud/storage";
import { configurationProvider, createLogger } from "@mondomob/gae-js-core";
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

  if (configuration.storageCredentials) {
    logger.info(`Using custom storage credentials`);
    storageSettings.credentials = {
      client_email: configuration.storageCredentials.clientEmail,
      private_key: configuration.storageCredentials.privateKey,
    };
  }

  const emulatorHost = configuration.storageEmulatorHost;
  if (emulatorHost) {
    logger.info(`Using storage emulator: ${emulatorHost}`);
    process.env.STORAGE_EMULATOR_HOST = emulatorHost;
  }

  return new Storage(storageSettings);
};
