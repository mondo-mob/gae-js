import { iots as t, GaeJsCoreConfiguration } from "@dotrun/gae-js-core";

export const gaeJsTasksConfigurationSchema = t.partial({
  serviceTasksOnThisVersion: t.string,
});

export type GaeJsTasksConfiguration = t.TypeOf<typeof gaeJsTasksConfigurationSchema> & GaeJsCoreConfiguration;
