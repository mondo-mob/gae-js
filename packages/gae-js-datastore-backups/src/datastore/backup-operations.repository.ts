import { TimestampedRepository } from "@mondomob/gae-js-datastore";
import { BackupOperation } from "../backups";

export const backupOperationsKind = "backup-operations";
export const backupOperationsRepository = new TimestampedRepository<BackupOperation>(backupOperationsKind);
