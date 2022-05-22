import { Bucket, Storage } from "@google-cloud/storage";
import { configurationProvider, createLogger } from "@mondomob/gae-js-core";
import { GaeJsStorageConfiguration } from "../configuration";
import { storageProvider } from "./storage-provider";

export interface StorageServiceOptions {
  storage?: Storage;
  configuration?: GaeJsStorageConfiguration;
}

export class StorageService {
  private readonly _storage: Storage;
  private readonly _defaultBucket: Bucket;
  private readonly logger = createLogger("storageService");
  private readonly configuration;

  constructor(options?: StorageServiceOptions) {
    this._storage = options?.storage || storageProvider.get();
    this.configuration = options?.configuration || configurationProvider.get<GaeJsStorageConfiguration>();
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
    const origin = this.configuration.storageOrigin || this.configuration.host;
    if (!origin) {
      this.logger.warn('Unable to set upload origin - please configure "storageOrigin" or "host"');
    }
    const urls = await gcsFile.createResumableUpload({ origin });
    return urls[0];
  }

  async getDefaultBucketSignedDownloadUrl(fileId: string, expiryInMs: number): Promise<string> {
    const gcsFile = this._defaultBucket.file(fileId);
    const urls = await gcsFile.getSignedUrl({
      action: "read",
      expires: Date.now() + expiryInMs,
    });
    return urls[0];
  }
}
