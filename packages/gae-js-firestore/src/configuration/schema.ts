import * as t from "io-ts";

export const gaeJsFirestoreConfigurationSchema = t.partial({
  firestoreProjectId: t.string,
  firestoreHost: t.string,
  firestorePort: t.number,
});

export type GaeJsFirestoreConfiguration = t.TypeOf<typeof gaeJsFirestoreConfigurationSchema>;
