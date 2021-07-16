import * as t from "io-ts";
import { GaeJsCoreConfiguration } from "@dotrun/gae-js-core";

export const gaeJsGaeSearchConfigurationSchema = t.type({
  searchServiceEndpoint: t.string,
});

export type GaeJsGaeSearchConfiguration = t.TypeOf<typeof gaeJsGaeSearchConfigurationSchema> & GaeJsCoreConfiguration;
