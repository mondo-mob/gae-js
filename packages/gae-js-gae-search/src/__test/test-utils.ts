import { configurationProvider, gaeJsCoreConfigurationSchema, zodValidator } from "@mondomob/gae-js-core";
import { z } from "zod";
import { GaeJsGaeSearchConfiguration, gaeJsGaeSearchConfigurationSchema } from "../configuration";

export interface RepositoryItem {
  id: string;
  name: string;
}

export const repositoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const initTestConfig = async (
  config?: Partial<GaeJsGaeSearchConfiguration>
): Promise<GaeJsGaeSearchConfiguration> => {
  const schema = gaeJsCoreConfigurationSchema.merge(gaeJsGaeSearchConfigurationSchema);
  process.env.GAEJS_PROJECT = "search-tests";
  process.env.GAEJS_CONFIG_OVERRIDES = JSON.stringify({
    searchServiceEndpoint: "http://localhost:9999",
    ...config,
  });
  await configurationProvider.init({ validator: zodValidator<GaeJsGaeSearchConfiguration>(schema) });
  return configurationProvider.get<GaeJsGaeSearchConfiguration>();
};
