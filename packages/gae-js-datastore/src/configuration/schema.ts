import * as t from "io-ts";

export const gaeJsDatastoreConfigurationSchema = t.partial({
  datastoreProjectId: t.string,
  datastoreApiEndpoint: t.string,
});

export type GaeJsDatastoreConfiguration = t.TypeOf<typeof gaeJsDatastoreConfigurationSchema>;
