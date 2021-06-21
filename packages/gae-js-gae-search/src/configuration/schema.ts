import * as t from "io-ts";

export const gaeJsGaeSearchConfigurationSchema = t.type({
  searchServiceEndpoint: t.string,
});

export type GaeJsGaeSearchConfiguration = t.TypeOf<typeof gaeJsGaeSearchConfigurationSchema>;
