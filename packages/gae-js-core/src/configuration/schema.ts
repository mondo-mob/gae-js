import * as t from "io-ts";

export const gaeJsCoreConfigurationSchema = t.intersection([
  t.type({
    projectId: t.string,
  }),
  t.partial({
    host: t.string,
    location: t.string,
    secretsProjectId: t.string,
  }),
]);

export type GaeJsCoreConfiguration = t.TypeOf<typeof gaeJsCoreConfigurationSchema>;
