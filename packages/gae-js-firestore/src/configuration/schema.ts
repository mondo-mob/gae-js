import { gaeJsCoreConfigurationSchema } from "@mondomob/gae-js-core";
import { z } from "zod";

export const gaeJsFirestoreConfigurationSchema = gaeJsCoreConfigurationSchema.extend({
  firestoreProjectId: z.string().optional(),
  firestoreHost: z.string().optional(),
  firestorePort: z.number().optional(),
});

export type GaeJsFirestoreConfiguration = z.infer<typeof gaeJsFirestoreConfigurationSchema>;
