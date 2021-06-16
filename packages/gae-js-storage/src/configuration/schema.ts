import * as t from "io-ts";
import { gaeJsCoreConfigurationSchema } from "@dotrun/gae-js-core";

export const gaeJsStorageConfigurationSchema = t.intersection([
  gaeJsCoreConfigurationSchema,
  t.type({
    storageDefaultBucket: t.string,
  }),
  t.partial({
    storageProjectId: t.string,
    storageApiEndpoint: t.string,
  }),
]);

export type GaeJsStorageConfiguration = t.TypeOf<typeof gaeJsStorageConfigurationSchema>;
