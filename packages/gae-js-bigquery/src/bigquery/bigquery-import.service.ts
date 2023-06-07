import { BigQuery } from "@google-cloud/bigquery";
import { Storage } from "@google-cloud/storage";
import { createLogger } from "@mondomob/gae-js-core";
import { parseGcsUri, storageProvider } from "@mondomob/gae-js-storage";
import { bigQueryProvider } from "./bigquery-provider";

export interface BigQueryImportServiceOptions {
  bigQuery?: BigQuery;
  storage?: Storage;
}

/**
 * Service to help with common data import tasks.
 */
export class BigQueryImportService {
  protected readonly logger = createLogger(BigQueryImportService.name);
  protected bigQuery?: BigQuery;
  protected storage?: Storage;

  constructor(options?: BigQueryImportServiceOptions) {
    this.bigQuery = options?.bigQuery;
    this.storage = options?.storage;
  }

  /**
   * Imports an exported Datastore kind or Firestore collection into BigQuery.
   * Note the source format for both Datastore and Firestore exports is `DATASTORE_BACKUP`.
   */
  async importDatastoreExport(gcsObjectPath: string, targetDataset: string, targetTable: string): Promise<string> {
    this.logger.info(`Start datastore/firestore export into BigQuery table ${targetDataset}.${targetTable}`);

    const { bucket, name } = parseGcsUri(gcsObjectPath);
    const table = await this.getBigQuery().dataset(targetDataset).table(targetTable);
    const [job] = await table.load(this.getStorage().bucket(bucket).file(name), {
      autodetect: false,
      sourceFormat: "DATASTORE_BACKUP",
      writeDisposition: "WRITE_TRUNCATE",
    });

    this.logger.info(`Load job ${job.id} completed.`);

    const tablePath = `${table.dataset.id}.${table.id}`;
    if (!(await table.exists())) {
      const msg = `Import complete but table ${tablePath} doesn't exist`;
      this.logger.warn(msg);
      return msg;
    }

    const [row] = await this.getBigQuery().query(`SELECT COUNT(1) as count FROM \`${tablePath}\``);
    this.logger.info(`Number of rows for table ${tablePath}: ${row[0].count}`);
    return `BigQuery Load for ${table} complete`;
  }

  private getBigQuery(): BigQuery {
    return this.bigQuery ?? bigQueryProvider.get();
  }

  private getStorage(): Storage {
    return this.storage ?? storageProvider.get();
  }
}
