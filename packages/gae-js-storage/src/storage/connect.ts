import { Storage, StorageOptions } from "@google-cloud/storage";
import { configurationProvider, createLogger, isGcpEnvironment } from "@dotrun/gae-js-core";
import { GaeJsStorageConfiguration } from "../configuration";

export interface StorageConnectOptions {
  configuration?: GaeJsStorageConfiguration;
  storageOptions?: StorageOptions;
}

export const connectStorage = (options?: StorageConnectOptions): Storage => {
  const logger = createLogger("connectStorage");
  const configuration = options?.configuration || configurationProvider.get<GaeJsStorageConfiguration>();

  if (isGcpEnvironment()) {
    logger.info("Running in deployed environment");
    return new Storage({
      projectId: configuration.storageProjectId || undefined,
      ...options?.storageOptions,
    });
  }

  const storageSettings: StorageOptions = {
    projectId: configuration.storageProjectId,
    apiEndpoint: configuration.storageApiEndpoint,
    credentials: { client_email: "storage@example.com", private_key: "{}" },
    ...options?.storageOptions,
  };
  logger.info(
    "Connecting to storage in non-deployed environment: " +
      `${storageSettings.projectId}@${storageSettings.apiEndpoint}`
  );
  return new Storage(storageSettings);
};
