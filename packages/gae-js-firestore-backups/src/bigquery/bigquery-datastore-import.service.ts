import assert from "assert";
import { BigQuery } from "@google-cloud/bigquery";
import { Storage } from "@google-cloud/storage";
import { createLogger, LazyProvider } from "@mondomob/gae-js-core";
import { connectBigQuery } from "@mondomob/gae-js-bigquery";
import { connectStorage, parseStorageUri } from "@mondomob/gae-js-storage";
import { BackupOperation, backupTaskServiceProvider } from "../backups";
import { BigQueryLoadRequest } from "./bigquery-load-request";
import { TASK_BIGQUERY_LOAD_COLLECTION } from "./bigquery-load-task-routes";

/**
 * Service for importing Datastore and/or Firestore exports into BigQuery.
 * We use Firestore naming - i.e. collection rather than kind but can be used for either
 * Note the source format for both Datastore and Firestore exports is `DATASTORE_BACKUP`.
 */
class BigQueryDatastoreImportService {
  private readonly logger = createLogger(BigQueryDatastoreImportService.name);
  private readonly bigQuery: BigQuery;
  private readonly storage: Storage;

  constructor() {
    this.bigQuery = connectBigQuery();
    this.storage = connectStorage();
  }

  async queueImportFromBackup(backupOperation: BackupOperation) {
    assert.ok(backupOperation.collectionIds);
    assert.ok(backupOperation.targetDataset);
    for (const collectionId of backupOperation.collectionIds) {
      const gcsObjectPath = `${backupOperation.outputUriPrefix}/all_namespaces/kind_${collectionId}/all_namespaces_kind_${collectionId}.export_metadata`;
      this.logger.info(`Queue importing collection ${collectionId} from GCS: ${gcsObjectPath}`);
      await this.queueBigQueryLoadCollection({
        gcsObjectPath,
        dataset: backupOperation.targetDataset,
        collectionId,
      });
    }
  }

  async importCollection(gcsObjectPath: string, dataset: string, collectionId: string): Promise<string> {
    this.logger.info(`Start importing collection ${collectionId} into BigQuery dataset ${dataset}`);

    const { bucket, objectName } = parseStorageUri(gcsObjectPath);
    const [job] = await this.bigQuery
      .dataset(dataset)
      .table(collectionId)
      .load(this.storage.bucket(bucket).file(objectName), {
        autodetect: false,
        sourceFormat: "DATASTORE_BACKUP",
        writeDisposition: "WRITE_TRUNCATE",
      });

    this.logger.info(`Load job ${job.id} completed.`);

    const table = await this.bigQuery.dataset(dataset).table(collectionId);

    const tablePath = `${table.dataset.id}.${table.id}`;
    if (!(await table.exists())) {
      const msg = `Import complete but table ${tablePath} doesn't exist`;
      this.logger.warn(msg);
      return msg;
    }

    const [row] = await this.bigQuery.query(`SELECT COUNT(1) as count
                                                 FROM \`${tablePath}\``);
    this.logger.info(`Number of rows for table ${tablePath}: ${row[0].count}`);
    return `BigQuery Load for ${collectionId} complete`;
  }

  private async queueBigQueryLoadCollection(options: BigQueryLoadRequest) {
    return backupTaskServiceProvider.get().enqueue<BigQueryLoadRequest>(TASK_BIGQUERY_LOAD_COLLECTION, options);
  }
}

export const bigQueryDatastoreImportServiceProvider = new LazyProvider(() => new BigQueryDatastoreImportService());
