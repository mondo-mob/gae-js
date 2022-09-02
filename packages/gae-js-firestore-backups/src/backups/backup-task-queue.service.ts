import { LazyProvider } from "@mondomob/gae-js-core";
import { TaskQueueService } from "@mondomob/gae-js-tasks";
import { getCoreBackupConfiguration } from "../configuration";

export const DEFAULT_BACKUP_QUEUE = "backup-queue";

export class BackupTaskQueueService extends TaskQueueService {
  constructor() {
    const config = getCoreBackupConfiguration();
    const backupConfig = config.firestoreBackup;
    super({
      queueName: backupConfig?.queue || DEFAULT_BACKUP_QUEUE,
      pathPrefix: backupConfig?.taskPrefix,
      configuration: {
        ...config,
        ...(backupConfig?.taskService ? { tasksRoutingService: backupConfig.taskService } : undefined),
      },
    });
  }
}

export const backupTaskServiceProvider = new LazyProvider(() => new BackupTaskQueueService());
