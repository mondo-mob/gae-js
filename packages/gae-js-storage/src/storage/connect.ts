import { Storage, StorageOptions } from "@google-cloud/storage";
import { configurationStore, createLogger, isGcpEnvironment } from "@dotrun/gae-js-core";
import { GaeJsStorageConfiguration } from "../configuration";

export const connectStorage = (settings?: StorageOptions): Storage => {
  const logger = createLogger("connectStorage");
  const configuration = configurationStore.get<GaeJsStorageConfiguration>();

  if (isGcpEnvironment()) {
    logger.info("Running in deployed environment");
    return new Storage({
      projectId: configuration.storageProjectId || undefined,
      ...settings,
    });
  }

  const storageSettings: StorageOptions = {
    projectId: configuration.storageProjectId,
    apiEndpoint: configuration.storageApiEndpoint,
    credentials: { client_email: "storage@example.com", private_key: "{}" },
    ...settings,
  };
  logger.info(
    "Connecting to storage in non-deployed environment: " +
      `${storageSettings.projectId}@${storageSettings.apiEndpoint}`
  );
  return new Storage(storageSettings);
};
