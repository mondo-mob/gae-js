import { Datastore, DatastoreOptions } from "@google-cloud/datastore";
import { configurationProvider, zodValidator } from "@mondomob/gae-js-core";
import { GaeJsDatastoreConfiguration, gaeJsDatastoreConfigurationSchema } from "../configuration";

export interface RepositoryItem {
  id: string;
  name: string;
}

export const initTestConfig = async (config: Record<string, unknown> = {}): Promise<GaeJsDatastoreConfiguration> => {
  await configurationProvider.init({
    validator: zodValidator(gaeJsDatastoreConfigurationSchema),
    projectId: "datastore-tests",
    overrides: config,
  });
  return configurationProvider.get<GaeJsDatastoreConfiguration>();
};

export const initEmulatorConfig = async (
  config?: Partial<GaeJsDatastoreConfiguration>
): Promise<GaeJsDatastoreConfiguration> => {
  return initTestConfig({
    datastoreProjectId: "datastore-tests",
    datastoreApiEndpoint: "localhost:8081",
    ...config,
  });
};

export const connectDatastoreEmulator = (settings?: DatastoreOptions): Datastore => {
  return new Datastore({
    projectId: "datastore-tests",
    apiEndpoint: "localhost:8081",
    credentials: { client_email: "test@example.com", private_key: "{}" },
    ...settings,
  });
};

export const deleteKind = async (datastore: Datastore, kind: string): Promise<void> => {
  const [results] = await datastore.createQuery(kind).limit(100).run();

  const keys = results.map((result) => result[Datastore.KEY]);
  await datastore.delete(keys);

  if (results.length === 100) {
    await deleteKind(datastore, kind);
  }
};

export const deleteKinds = async (datastore: Datastore, ...kinds: string[]): Promise<void> => {
  for (const kind of kinds) {
    await deleteKind(datastore, kind);
  }
};
