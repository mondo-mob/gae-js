import { configurationProvider, iots as t, gaeJsCoreConfigurationSchema, iotsValidator } from "@mondomob/gae-js-core";
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
  process.env.GAEJS_PROJECT = "search-tests";
  process.env.GAEJS_CONFIG_OVERRIDES = JSON.stringify({
    searchServiceEndpoint: "http://localhost:9999",
    ...config,
  });
  await configurationProvider.init({ validator: iotsValidator(schema) });
  return configurationProvider.get<GaeJsGaeSearchConfiguration>();
};
