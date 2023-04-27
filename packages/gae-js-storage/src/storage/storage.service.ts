import { Bucket, CreateResumableUploadOptions, FileOptions, Storage } from "@google-cloud/storage";
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
  private readonly configuration: GaeJsStorageConfiguration;

  constructor({ storage, configuration }: StorageServiceOptions = {}) {
    this._storage = storage || storageProvider.get();
    this.configuration = configuration || configurationProvider.get<GaeJsStorageConfiguration>();
    let defaultBucket = this.configuration.storage?.defaultBucket;
    if (defaultBucket) {
      this.logger.info(`Using default Google Cloud Storage bucket: ${defaultBucket}`);
    } else {
      defaultBucket = `${this.configuration.projectId}.appspot.com`;
      this.logger.info(`No default bucket configured - falling back to project bucket: ${defaultBucket}`);
    }
    this._defaultBucket = this.storage.bucket(defaultBucket);
    if (configuration?.storage?.skipDefaultBucketValidation) {
      this.logger.info(`Skipping default bucket validation for ${defaultBucket}.`);
    } else {
      this._defaultBucket
        .exists()
        .then((exists) => {
          if (exists) {
            this.logger.info(`Default bucket ${defaultBucket} validated successfully.`);
          } else {
            this.logger.error(
              `Default bucket ${defaultBucket} doesn't exist - please create it or configure valid bucket.`
            );
          }
        })
        .catch((err) => this.logger.error(`Error checking if bucket ${defaultBucket} exists.`, err));
    }
  }

  get storage(): Storage {
    return this._storage;
  }

  get defaultBucket(): Bucket {
    return this._defaultBucket;
  }

  async getDefaultBucketResumableUploadUrl(
    fileId: string,
    uploadOptions?: CreateResumableUploadOptions,
    fileOptions?: FileOptions
  ): Promise<string> {
    const gcsFile = this._defaultBucket.file(fileId, fileOptions);
    const origin = uploadOptions?.origin || this.configuration.storage?.origin || this.configuration.host;
    if (!origin) {
      this.logger.warn('Unable to set upload origin - please configure "storageOrigin" or "host"');
    }
    const urls = await gcsFile.createResumableUpload({ ...uploadOptions, origin });
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
