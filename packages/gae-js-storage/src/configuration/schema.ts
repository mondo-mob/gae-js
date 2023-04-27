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
      // Buckets are global but the sdk requires a default project - which may not be set when running locally
      projectId: z.string().optional(),
      // Skip checking if the default bucket exists. In some cases you may only have write access to a bucket and checking it exists requires read.
      skipDefaultBucketValidation: z.boolean().optional(),
    })
    .optional(),
});

export type GaeJsStorageConfiguration = z.infer<typeof gaeJsStorageConfigurationSchema>;
