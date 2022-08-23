import { Storage, StorageOptions } from "@google-cloud/storage";
import { configurationProvider, createLogger } from "@mondomob/gae-js-core";
import { GaeJsStorageConfiguration } from "../configuration";

export interface StorageConnectOptions {
  configuration?: GaeJsStorageConfiguration;
  storageOptions?: StorageOptions;
}

export const connectStorage = (options?: StorageConnectOptions): Storage => {
  const logger = createLogger("connectStorage");
  const { storage: configuration } = options?.configuration || configurationProvider.get<GaeJsStorageConfiguration>();

  logger.info("Initialising Storage");
  const storageSettings: StorageOptions = {
    apiEndpoint: configuration.apiEndpoint || undefined,
    ...options?.storageOptions,
  };

  if (configuration.credentials) {
    logger.info(`Using custom storage credentials`);
    storageSettings.credentials = {
      client_email: configuration.credentials.clientEmail,
      private_key: configuration.credentials.privateKey,
    };
  }

  const emulatorHost = configuration.emulatorHost;
  if (emulatorHost) {
    logger.info(`Using storage emulator: ${emulatorHost}`);
    process.env.STORAGE_EMULATOR_HOST = emulatorHost;
  }

  return new Storage(storageSettings);
};
