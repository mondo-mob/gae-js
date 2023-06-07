import { Storage } from "@google-cloud/storage";

export interface GcsFileIdentifier {
  bucket: string;
  name: string;
}

export interface GcsPublicFile extends GcsFileIdentifier {
  publicUrl: string;
}

export interface WriteFileOptions {
  data: string | Buffer;
  fileName: string;
  publicReadable?: boolean;
  contentType?: string;
}

export interface CopyFileOptions {
  fileName?: string;
  filePath?: string;
}

export interface CreateStorageServiceOptions {
  /**
   * Full name of bucket to use.
   * If not specified will default to `bucketNamePrefix` option
   */
  bucketName?: string;
  /**
   * Prefix for bucket name.
   * A suffix will be added of the current project id. i.e. [prefix]-[projectId]
   * If not specified will default to bucket [projectId].appspot.com
   */
  bucketNamePrefix?: string;
  /**
   * Origin to use for upload urls.
   * Defaults to application host configuration
   */
  origin?: string;
  /**
   * Skip checking if the bucket exists.
   * In some cases you may only have write access to a bucket and checking it exists requires read.
   */
  skipBucketValidation?: boolean;
  /**
   * Use an explicit Storage client (e.g. if not using storageProvider)
   */
  storage?: Storage;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StorageServiceOptions extends CreateStorageServiceOptions {}
