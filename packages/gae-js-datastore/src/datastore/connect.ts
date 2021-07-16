import { Datastore, DatastoreOptions } from "@google-cloud/datastore";
import { configurationStore, createLogger, isGcpEnvironment } from "@dotrun/gae-js-core";
import { GaeJsDatastoreConfiguration } from "../configuration";

export interface DatastoreConnectOptions {
  configuration?: GaeJsDatastoreConfiguration;
  datastoreOptions?: DatastoreOptions;
}

export const connectDatastore = (options?: DatastoreConnectOptions): Datastore => {
  const logger = createLogger("connectDatastore");
  const configuration = options?.configuration || configurationStore.get<GaeJsDatastoreConfiguration>();

  if (isGcpEnvironment()) {
    logger.info("Running in deployed environment");
    return new Datastore({
      projectId: configuration.datastoreProjectId || undefined,
      ...options?.datastoreOptions,
    });
  }

  const datastoreSettings: DatastoreOptions = {
    projectId: configuration.datastoreProjectId,
    apiEndpoint: configuration.datastoreApiEndpoint,
    ...options?.datastoreOptions,
  };
  logger.info(
    "Connecting to datastore in non-deployed environment: " +
      `${datastoreSettings.projectId}@${datastoreSettings.apiEndpoint}`
  );
  return new Datastore({
    ...datastoreSettings,
    credentials: { client_email: "datastore@example.com", private_key: "{}" },
  });
};
