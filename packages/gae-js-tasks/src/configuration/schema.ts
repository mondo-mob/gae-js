import { GaeJsCoreConfiguration } from "@mondomob/gae-js-core";
import { z } from "zod";

export const gaeJsTasksConfigurationSchema = z.object({
  tasksRoutingVersion: z.string().optional(),
  tasksRoutingService: z.string().optional(),
  tasksLocation: z.string().optional(),
  tasksProjectId: z.string().optional(),
});

export type GaeJsTasksConfiguration = z.infer<typeof gaeJsTasksConfigurationSchema> & GaeJsCoreConfiguration;
