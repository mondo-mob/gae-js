import { GaeJsCoreConfiguration } from "@mondomob/gae-js-core";
import { z } from "zod";

export const gaeJsStorageConfigurationSchema = z.object({
  storageDefaultBucket: z.string(),
  storageApiEndpoint: z.string().optional(),
  // Emulator host is separate from the api endpoint because to connect to Firebase storage emulator
  // you need to set the STORAGE_EMULATOR_HOST environment variable instead
  storageEmulatorHost: z.string().optional(),
  storageCredentials: z
    .object({
      clientEmail: z.string(),
      privateKey: z.string(),
    })
    .optional(),
  storageOrigin: z.string().optional(),
});

export type GaeJsStorageConfiguration = z.infer<typeof gaeJsStorageConfigurationSchema> & GaeJsCoreConfiguration;
