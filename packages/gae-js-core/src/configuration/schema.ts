import * as t from "io-ts";

export const gaeJsCoreConfigurationSchema = t.type({
  projectId: t.string,
  host: t.string,
  location: t.string,
});

export type GaeJsCoreConfiguration = t.TypeOf<typeof gaeJsCoreConfigurationSchema>;
