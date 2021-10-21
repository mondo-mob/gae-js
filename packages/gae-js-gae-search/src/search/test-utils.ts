import { configurationProvider, iots as t, gaeJsCoreConfigurationSchema } from "@dotrun/gae-js-core";
import { GaeJsGaeSearchConfiguration, gaeJsGaeSearchConfigurationSchema } from "../configuration";

export interface RepositoryItem {
  id: string;
  name: string;
}

export const repositoryItemSchema = t.type({
  id: t.string,
  name: t.string,
});

export const initTestConfig = async (
  config?: Partial<GaeJsGaeSearchConfiguration>
): Promise<GaeJsGaeSearchConfiguration> => {
  const schema = t.intersection([gaeJsCoreConfigurationSchema, gaeJsGaeSearchConfigurationSchema]);
  process.env.NODE_CONFIG = JSON.stringify({
    projectId: "datastore-tests",
    host: "localhost",
    location: "local",
    searchServiceEndpoint: "http://localhost:9999",
    ...config,
  });
  await configurationProvider.init(schema);
  return configurationProvider.get<GaeJsGaeSearchConfiguration>();
};
