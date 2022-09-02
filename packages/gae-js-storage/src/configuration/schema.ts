import { gaeJsCoreConfigurationSchema } from "@mondomob/gae-js-core";
import { z } from "zod";

export const gaeJsStorageConfigurationSchema = gaeJsCoreConfigurationSchema.extend({
  storage: z
    .object({
      defaultBucket: z.string().optional(),
      apiEndpoint: z.string().optional(),
      // Emulator host is separate from the api endpoint because to connect to Firebase storage emulator
      // you need to set the STORAGE_EMULATOR_HOST environment variable instead
      emulatorHost: z.string().optional(),
      credentials: z
        .object({
          clientEmail: z.string(),
          privateKey: z.string(),
        })
        .optional(),
      origin: z.string().optional(),
    })
    .optional(),
});

export type GaeJsStorageConfiguration = z.infer<typeof gaeJsStorageConfigurationSchema>;
