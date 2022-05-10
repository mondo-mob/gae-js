import { GaeJsCoreConfiguration, iots as t } from "@mondomob/gae-js-core";

export const gaeJsStorageConfigurationSchema = t.intersection([
  t.type({
    storageDefaultBucket: t.string,
  }),
  t.partial({
    storageApiEndpoint: t.string,
    // Emulator host is separate from the api endpoint because to connect to Firebase storage emulator
    // you need to set the STORAGE_EMULATOR_HOST environment variable instead
    emulatorHost: t.string,
    storageCredentials: t.type({
      clientEmail: t.string,
      privateKey: t.string,
    }),
  }),
]);

export type GaeJsStorageConfiguration = t.TypeOf<typeof gaeJsStorageConfigurationSchema> & GaeJsCoreConfiguration;
