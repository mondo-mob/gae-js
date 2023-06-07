import { Bucket, CreateResumableUploadOptions, File, FileOptions, Storage } from "@google-cloud/storage";
import { configurationProvider, createLogger } from "@mondomob/gae-js-core";
import { storageProvider } from "./storage-provider";
import {
  CopyFileOptions,
  CreateStorageServiceOptions,
  GcsFileIdentifier,
  StorageServiceOptions,
  WriteFileOptions,
} from "./types";
import { gcsPathJoin, generateSignedDownloadUrl, toGcsFile, toGcsSaveOptions, toGcsUri } from "./utils";
import { gcsPromiseLimit } from "./promises";
import path from "path";

/**
 * Storage service for performing common GCS actions against a bucket.
 */
export class StorageService {
  protected readonly logger = createLogger("storageService");
  private readonly bucket: Bucket;
  private readonly options: StorageServiceOptions;

  constructor(options: CreateStorageServiceOptions = {}) {
    this.options = { ...options };
    this.bucket = this.initBucket();
  }

  getBucket(): Bucket {
    return this.bucket;
  }

  async readFile(fileName: string): Promise<string> {
    const file = this.bucket.file(fileName);
    this.logger.info(`Reading object ${toGcsUri(file)} from Google Cloud Storage`);
    const contents = await file.download();
    return contents.toString();
  }

  async writeFile({
    data,
    fileName,
    publicReadable = false,
    contentType = undefined,
  }: WriteFileOptions): Promise<File> {
    const file = this.bucket.file(fileName);
    this.logger.info(`Writing object ${toGcsUri(file)} to Google Cloud Storage`);
    await file.save(data, toGcsSaveOptions({ publicReadable, contentType }));
    return file;
  }

  async copyToBucket(src: File | GcsFileIdentifier, { fileName, filePath }: CopyFileOptions = {}): Promise<File> {
    const srcFile = toGcsFile(src, { storage: this.getStorage() });
    const destination = fileName
      ? this.bucket.file(fileName)
      : filePath
      ? this.bucket.file(gcsPathJoin(filePath, path.basename(src.name)))
      : this.bucket;
    const [file] = await srcFile.copy(destination);
    return file;
  }

  async copyAllToBucket(
    src: Array<File | GcsFileIdentifier>,
    options?: Pick<CopyFileOptions, "filePath">
  ): Promise<File[]> {
    return Promise.all(src.map((f) => gcsPromiseLimit(() => this.copyToBucket(f, options))));
  }

  async deleteAll(prefix: string) {
    const [files] = await this.bucket.getFiles({ prefix });

    if (!files.length) {
      this.logger.info(`No files to clean for path: ${prefix}`);
      return;
    }

    this.logger.info(`Deleting: ${files.length} files from path: ${prefix}`);
    await Promise.all(
      files.map(async (file: File) =>
        gcsPromiseLimit(async () => {
          await file.delete({ ignoreNotFound: true });
          this.logger.info(`Deleted file: ${toGcsUri(file)}`);
        })
      )
    );
    this.logger.info(`Deleted: ${files.length} files from path: ${prefix}`);
  }

  async getResumableUploadUrl(
    fileId: string,
    uploadOptions?: CreateResumableUploadOptions,
    fileOptions?: FileOptions
  ): Promise<string> {
    const gcsFile = this.bucket.file(fileId, fileOptions);
    const origin = uploadOptions?.origin || this.options.origin || configurationProvider.get().host;
    if (!origin) {
      this.logger.warn('Unable to set upload origin - please supply "origin" or configure "host" for application');
    }
    const urls = await gcsFile.createResumableUpload({ ...uploadOptions, origin });
    return urls[0];
  }

  async getSignedDownloadUrl(fileId: string, expiryInMs: number): Promise<string> {
    return generateSignedDownloadUrl(this.bucket.file(fileId), { expiryInMs, storage: this.getStorage() });
  }

  private initBucketName = (): string => {
    if (this.options.bucketName) {
      this.logger.info(`Using GCS bucket: ${this.options.bucketName}`);
      return this.options.bucketName;
    }

    if (this.options.bucketNamePrefix) {
      const bucketName = `${this.options.bucketNamePrefix}-${configurationProvider.get().projectId}`;
      this.logger.info(`Using prefixed GCS bucket: ${bucketName}`);
      return bucketName;
    }

    const bucketName = `${configurationProvider.get().projectId}.appspot.com`;
    this.logger.info(`No bucket configured - falling back to project bucket: ${bucketName}`);
    return bucketName;
  };

  private checkBucketExists = (bucket: Bucket): void => {
    if (this.options?.skipBucketValidation) {
      this.logger.info(`Skipping bucket validation for ${bucket.name}.`);
    } else {
      bucket
        .exists()
        .then((exists) => {
          if (exists) {
            this.logger.info(`Bucket ${bucket.name} validated successfully.`);
          } else {
            this.logger.error(`Bucket ${bucket.name} doesn't exist - please create it or configure valid bucket.`);
          }
        })
        .catch((err) => this.logger.error(`Error checking if bucket ${bucket.name} exists.`, err));
    }
  };

  private initBucket = (): Bucket => {
    const bucket = this.getStorage().bucket(this.initBucketName());
    this.checkBucketExists(bucket);
    return bucket;
  };

  private getStorage = (): Storage => {
    return this.options.storage ?? storageProvider.get();
  };
}
