import { gaeJsCoreConfigurationSchema } from "@mondomob/gae-js-core";
import { z } from "zod";

export const gaeJsDatastoreConfigurationSchema = gaeJsCoreConfigurationSchema.extend({
  datastoreProjectId: z.string().optional(),
  datastoreApiEndpoint: z.string().optional(),
});

export type GaeJsDatastoreConfiguration = z.infer<typeof gaeJsDatastoreConfigurationSchema>;
