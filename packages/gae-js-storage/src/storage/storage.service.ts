import { Bucket, Storage } from "@google-cloud/storage";
import { configurationStore, createLogger } from "@dotrun/gae-js-core";
import { GaeJsStorageConfiguration } from "../configuration";
import { storageProvider } from "./storage-provider";

export class StorageService {
  private readonly _storage: Storage;
  private readonly _defaultBucket: Bucket;
  private readonly logger = createLogger("storageService");
  private readonly configuration = configurationStore.get<GaeJsStorageConfiguration>();

  constructor(storage?: Storage) {
    this._storage = storage || storageProvider.get();
    this.logger.info(`Default Google Cloud Storage bucket: ${this.configuration.storageDefaultBucket}`);
    this._defaultBucket = this.storage.bucket(this.configuration.storageDefaultBucket);
  }

  get storage(): Storage {
    return this._storage;
  }

  get defaultBucket(): Bucket {
    return this._defaultBucket;
  }

  async getDefaultBucketResumableUploadUrl(fileId: string): Promise<string> {
    const gcsFile = this._defaultBucket.file(fileId);
    const urls = await gcsFile.createResumableUpload({
      origin: this.configuration.host,
    });
    return urls[0];
  }
}
