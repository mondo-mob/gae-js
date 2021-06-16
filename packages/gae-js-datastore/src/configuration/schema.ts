import * as t from "io-ts";
import { gaeJsCoreConfigurationSchema } from "@dotrun/gae-js-core";

export const gaeJsDatastoreConfigurationSchema = t.intersection([
  gaeJsCoreConfigurationSchema,
  t.partial({
    datastoreProjectId: t.string,
    datastoreApiEndpoint: t.string,
  }),
]);

export type GaeJsDatastoreConfiguration = t.TypeOf<typeof gaeJsDatastoreConfigurationSchema>;
