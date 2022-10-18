import { Datastore, DatastoreAdminClient, DatastoreOptions } from "@google-cloud/datastore";
import { configurationProvider, createLogger, runningOnGcp } from "@mondomob/gae-js-core";
import { GaeJsDatastoreConfiguration } from "../configuration";

export interface DatastoreConnectOptions {
  configuration?: GaeJsDatastoreConfiguration;
  datastoreOptions?: DatastoreOptions;
}

const getProjectId = (config: GaeJsDatastoreConfiguration): string | undefined =>
  runningOnGcp()
    ? // On GCP if you do not specify a datastoreProjectId the client will auto connect to the hosting project
      config.datastoreProjectId || undefined
    : // Outside GCP we fall back to the application project id
      config.datastoreProjectId || config.projectId;

/**
 * Connect a standard Datastore Client.
 */
export const connectDatastore = (options?: DatastoreConnectOptions): Datastore => {
  const logger = createLogger("connectDatastore");
  const config = options?.configuration || configurationProvider.get<GaeJsDatastoreConfiguration>();

  // If datastoreApiEndpoint specified then assume connecting to an emulator
  if (config.datastoreApiEndpoint) {
    const settings: DatastoreOptions = {
      projectId: getProjectId(config),
      apiEndpoint: config.datastoreApiEndpoint,
      credentials: { client_email: "datastore@example.com", private_key: "{}" },
      ...options?.datastoreOptions,
    };
    logger.info("Connecting to datastore emulator: " + `${settings.projectId}@${settings.apiEndpoint}`);
    return new Datastore(settings);
  }

  // Otherwise we connect to Datastore as per configuration
  const settings: DatastoreOptions = {
    projectId: getProjectId(config),
    ...options?.datastoreOptions,
  };
  logger.info(`Connecting Datastore Client for project ${settings.projectId || "(default)"}`);
  return new Datastore(settings);
};

// The proper typings from google-gax can be flaky depending on which version gets resolved
// It's safer to extract the types from client sdk
type AdminClientOptions = ConstructorParameters<typeof DatastoreAdminClient>[0];

export interface DatastoreAdminConnectOptions {
  configuration?: GaeJsDatastoreConfiguration;
  clientOptions?: AdminClientOptions;
}

/**
 * Creates a Datastore Admin Client. e.g. for admin operations like imports/exports.
 */
export const connectDatastoreAdmin = (options?: DatastoreAdminConnectOptions): DatastoreAdminClient => {
  const logger = createLogger("connectDatastoreAdmin");
  const config = options?.configuration || configurationProvider.get<GaeJsDatastoreConfiguration>();

  const clientOptions: AdminClientOptions = {
    projectId: getProjectId(config),
    ...options?.clientOptions,
  };
  logger.info(`Connecting Datastore Admin Client for project ${clientOptions.projectId || "(default)"}`);
  return new DatastoreAdminClient(clientOptions);
};
