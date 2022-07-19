import { iots as t, GaeJsCoreConfiguration } from "@mondomob/gae-js-core";

export const gaeJsTasksConfigurationSchema = t.partial({
  tasksRoutingVersion: t.string,
  tasksRoutingService: t.string,
  tasksLocation: t.string,
  tasksProjectId: t.string,
});

export type GaeJsTasksConfiguration = t.TypeOf<typeof gaeJsTasksConfigurationSchema> & GaeJsCoreConfiguration;
