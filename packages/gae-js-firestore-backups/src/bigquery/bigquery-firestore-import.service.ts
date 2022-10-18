import assert from "assert";
import { createLogger, LazyProvider } from "@mondomob/gae-js-core";
import { BigQueryImportService, connectBigQuery } from "@mondomob/gae-js-bigquery";
import { connectStorage } from "@mondomob/gae-js-storage";
import { BackupOperation, backupTaskServiceProvider } from "../backups";
import { BigQueryLoadRequest } from "./bigquery-load-request";
import { TASK_BIGQUERY_LOAD_COLLECTION } from "./bigquery-load-task-routes";

class BigQueryFirestoreImportService {
  protected readonly logger = createLogger(BigQueryFirestoreImportService.name);
  protected readonly bigQueryImportService: BigQueryImportService;

  constructor() {
    this.bigQueryImportService = new BigQueryImportService({
      bigQuery: connectBigQuery(),
      storage: connectStorage(),
    });
  }

  async queueImportFromBackup(backupOperation: BackupOperation) {
    assert.ok(backupOperation.collectionIds);
    assert.ok(backupOperation.outputUriPrefix);
    assert.ok(backupOperation.targetDataset);

    for (const collectionId of backupOperation.collectionIds) {
      await this.queueImportCollection(backupOperation.outputUriPrefix, backupOperation.targetDataset, collectionId);
    }
  }

  async queueImportCollection(gcsPrefix: string, targetDataset: string, collectionId: string): Promise<void> {
    const gcsObjectPath = `${gcsPrefix}/all_namespaces/kind_${collectionId}/all_namespaces_kind_${collectionId}.export_metadata`;
    this.logger.info(`Queue importing collection ${collectionId} from GCS: ${gcsObjectPath}`);
    return backupTaskServiceProvider.get().enqueue<BigQueryLoadRequest>(TASK_BIGQUERY_LOAD_COLLECTION, {
      gcsObjectPath,
      targetDataset,
      targetTable: collectionId,
    });
  }

  async importCollection(gcsObjectPath: string, targetDataset: string, collectionId: string): Promise<string> {
    return this.bigQueryImportService.importDatastoreExport(gcsObjectPath, targetDataset, collectionId);
  }
}

export const bigQueryFirestoreImportServiceProvider = new LazyProvider(() => new BigQueryFirestoreImportService());
