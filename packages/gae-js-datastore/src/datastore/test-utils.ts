import { Datastore, DatastoreOptions } from "@google-cloud/datastore";
import { iots as t, configurationProvider, iotsValidator } from "@mondomob/gae-js-core";
import { GaeJsDatastoreConfiguration, gaeJsDatastoreConfigurationSchema } from "../configuration";

export interface RepositoryItem {
  id: string;
  name: string;
}

export const repositoryItemSchema = t.type({
  id: t.string,
  name: t.string,
});

export const initTestConfig = async (
  config?: Partial<GaeJsDatastoreConfiguration>
): Promise<GaeJsDatastoreConfiguration> => {
  process.env.GAEJS_PROJECT = "datastore-tests";
  process.env.GAEJS_CONFIG_OVERRIDES = JSON.stringify({
    projectId: "datastore-tests",
    datastoreProjectId: "datastore-tests",
    datastoreApiEndpoint: "localhost:8081",
    ...config,
  });
  await configurationProvider.init({ validator: iotsValidator(gaeJsDatastoreConfigurationSchema) });
  return configurationProvider.get<GaeJsDatastoreConfiguration>();
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
