import { gaeJsCoreConfigurationSchema } from "@mondomob/gae-js-core";
import { z } from "zod";

export const gaeJsBigQueryConfigurationSchema = gaeJsCoreConfigurationSchema.extend({
  bigQuery: z
    .object({
      projectId: z.string().optional(),
    })
    .optional(),
});

export type GaeJsBigQueryConfiguration = z.infer<typeof gaeJsBigQueryConfigurationSchema>;
