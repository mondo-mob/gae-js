import { TimestampedRepository } from "@mondomob/gae-js-firestore";
import { BackupOperation } from "../backups";

export const backupOperationsCollection = "backup-operations";
export const backupOperationsRepository = new TimestampedRepository<BackupOperation>(backupOperationsCollection);
