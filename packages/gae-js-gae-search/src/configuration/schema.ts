import { GaeJsCoreConfiguration } from "@mondomob/gae-js-core";
import { z } from "zod";

export const gaeJsGaeSearchConfigurationSchema = z.object({
  searchServiceEndpoint: z.string(),
});

export type GaeJsGaeSearchConfiguration = z.infer<typeof gaeJsGaeSearchConfigurationSchema> & GaeJsCoreConfiguration;
