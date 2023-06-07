import { gaeJsCoreConfigurationSchema } from "@mondomob/gae-js-core";
import { z } from "zod";

export const gaeJsStorageConfigurationSchema = gaeJsCoreConfigurationSchema.extend({
  storage: z
    .object({
      /**
       * Storage api endpoint. Not usually required to be set.
       */
      apiEndpoint: z.string().optional(),
      /**
       * Emulator host url.
       * This is separate from the api endpoint because to connect to Firebase storage emulator
       * you additionally need to set the STORAGE_EMULATOR_HOST environment variable
       */
      emulatorHost: z.string().optional(),
      /**
       * Storage projectId.
       * Buckets are global but the SDK Client requires a project - which may not be set when running locally
       */
      projectId: z.string().optional(),
      /**
       * Specific service account key (in JSON format).
       * Useful for local development where Application Default Credentials don't work for signing urls, etc.
       * This should be fetched from Cloud Secrets.
       */
      serviceAccountKey: z.string().optional(),
    })
    .optional(),
});

export type GaeJsStorageConfiguration = z.infer<typeof gaeJsStorageConfigurationSchema>;
