import { iots as t, gaeJsCoreConfigurationSchema } from "@dotrun/gae-js-core";

export const gaeJsFirestoreConfigurationSchema = t.intersection([
  gaeJsCoreConfigurationSchema,
  t.partial({
    firestoreProjectId: t.string,
    firestoreHost: t.string,
    firestorePort: t.number,
  }),
]);

export type GaeJsFirestoreConfiguration = t.TypeOf<typeof gaeJsFirestoreConfigurationSchema>;
