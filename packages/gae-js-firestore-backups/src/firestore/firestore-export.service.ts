import { v4 as uuidv4 } from "uuid";
import assert from "assert";
import { FirestoreAdminClient } from "@google-cloud/firestore/types/v1/firestore_admin_client";
import { DateTime } from "luxon";
import { createLogger, LazyProvider, validateArrayNotEmpty, validateNotNil } from "@mondomob/gae-js-core";
import { connectFirestoreAdmin, newTimestampedEntity } from "@mondomob/gae-js-firestore";
import { FirestoreExportCheckRequest } from "./firestore-export-check-request";
import { BackupOperation, backupTaskServiceProvider } from "../backups";
import { FirestoreExportRequest } from "./firestore-export-request";
import { mergeExportOperation } from "./util";
import { backupOperationsRepository } from "./backup-operations.repository";
import { TASK_FIRESTORE_EXPORT_CHECK } from "./firestore-backup-task-routes";
import { getFirestoreBackupConfiguration } from "../configuration";

const UPDATE_STATUS_DELAY_SECONDS = 60;
const DEFAULT_TIME_ZONE = "Australia/Sydney";
const DEFAULT_FOLDER_FORMAT = "yyyy/MM/yyyyMMdd-HHmmss";

export class FirestoreExportService {
  private readonly logger = createLogger("firestoreExportService");
  private readonly adminClient: FirestoreAdminClient;
  private readonly folderFormat: string;
  private readonly projectId: string;
  private readonly timeZone: string;
  private readonly backupBucket: string;

  constructor() {
    const { projectId, firestoreProjectId, firestoreBackup } = getFirestoreBackupConfiguration();
    this.projectId = firestoreProjectId || projectId;
    this.backupBucket = firestoreBackup?.bucket || `firestore-backup-${this.projectId}`;
    this.timeZone = firestoreBackup?.timeZone || DEFAULT_TIME_ZONE;
    this.folderFormat = firestoreBackup?.folderFormat || DEFAULT_FOLDER_FORMAT;
    this.adminClient = connectFirestoreAdmin();
  }

  async startExport(options: FirestoreExportRequest): Promise<BackupOperation> {
    if (options.type === "EXPORT_TO_BIGQUERY") {
      validateNotNil(options.targetDataset, "targetDataset must be provided for export to BigQuery");
      validateArrayNotEmpty(options.collectionIds, "collectionIds required for export to BigQuery");
    }

    const name = options.name || "firestore-export";
    const collectionIds = options.collectionIds || [];
    const outputBucket = this.formatOutputBucket(name);
    const databaseName = this.adminClient.databasePath(this.projectId, "(default)");

    this.logger.info(
      { databaseName, collectionIds, outputBucket },
      `Starting firestore export: ${options.type} - ${name}`
    );
    const [operation] = await this.adminClient.exportDocuments({
      name: databaseName,
      outputUriPrefix: outputBucket,
      collectionIds: collectionIds,
    });
    assert.ok(operation.name, "No operation name/id returned for export");

    const backupOperation = mergeExportOperation(
      {
        ...newTimestampedEntity(uuidv4()),
        operationName: operation.name,
        type: options.type,
        name,
        collectionIds,
        targetDataset: options.targetDataset,
      },
      operation
    );
    await backupOperationsRepository.insert(backupOperation);

    this.logger.info(`Backup ${backupOperation.id} for operation ${backupOperation.operationName} started`);
    return backupOperation;
  }

  async updateOperation(backupId: string) {
    const backupOperation = await backupOperationsRepository.getRequired(backupId);

    this.logger.info(`Looking up details for operation ${backupOperation.operationName}`);
    const operation = await this.adminClient.checkExportDocumentsProgress(backupOperation.operationName);
    const updated = mergeExportOperation(backupOperation, operation);
    await backupOperationsRepository.save(updated);
    return updated;
  }

  async queueUpdateExportStatus(exportCheck: FirestoreExportCheckRequest): Promise<void> {
    await backupTaskServiceProvider
      .get()
      .enqueue<FirestoreExportCheckRequest>(TASK_FIRESTORE_EXPORT_CHECK, exportCheck, UPDATE_STATUS_DELAY_SECONDS);
  }

  private formatOutputBucket(exportName: string): string {
    const now = DateTime.local({ zone: this.timeZone });
    const folderName = now.toFormat(this.folderFormat);
    return `gs://${this.backupBucket}/${exportName}/${folderName}`;
  }
}

export const firestoreExportServiceProvider = new LazyProvider(() => new FirestoreExportService());
