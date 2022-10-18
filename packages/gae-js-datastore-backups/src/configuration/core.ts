import { z } from "zod";
import { configurationProvider } from "@mondomob/gae-js-core";
import { gaeJsTasksConfigurationSchema } from "@mondomob/gae-js-tasks";
import { gaeJsBigQueryConfigurationSchema } from "@mondomob/gae-js-bigquery";
import { gaeJsStorageConfigurationSchema } from "@mondomob/gae-js-storage";

const libraryConfig = gaeJsBigQueryConfigurationSchema
  .merge(gaeJsTasksConfigurationSchema)
  .merge(gaeJsStorageConfigurationSchema);

export const coreBackupConfigSchema = libraryConfig.extend({
  datastoreBackup: z
    .object({
      enabled: z.boolean().optional(),
      bucket: z.string().optional(),
      folderFormat: z.string().optional(),
      queue: z.string().optional(),
      taskPrefix: z.string().optional(),
      taskService: z.string().optional(),
      timeZone: z.string().optional(),
    })
    .optional(),
});

export type CoreBackupConfiguration = z.infer<typeof coreBackupConfigSchema>;

export const getCoreBackupConfiguration = () => configurationProvider.get<CoreBackupConfiguration>();
