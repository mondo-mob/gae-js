import { gaeJsCoreConfigurationSchema, iots as t } from "@dotrun/gae-js-core";

export const gaeJsStorageConfigurationSchema = t.intersection([
  gaeJsCoreConfigurationSchema,
  t.type({
    storageDefaultBucket: t.string,
  }),
  t.partial({
    storageApiEndpoint: t.string,
    // Emulator host is separate from the api endpoint because to connect to Firebase storage emulator
    // you need to set the STORAGE_EMULATOR_HOST environment variable instead
    emulatorHost: t.string,
  }),
]);

export type GaeJsStorageConfiguration = t.TypeOf<typeof gaeJsStorageConfigurationSchema>;
