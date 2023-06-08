import { BadRequestError } from "@mondomob/gae-js-core";
import { File, SaveOptions, Storage } from "@google-cloud/storage";
import { trim } from "lodash";
import { GcsFileIdentifier } from "./types";
import { storageProvider } from "./storage-provider";

const GS_BUCKET_AND_OBJECT_REGEX = /^gs:\/\/([A-Za-z0-9.\-_]+)\/(.*)$/;
const DEFAULT_SIGNED_URL_EXPIRY_MS = 10 * 60 * 1000;

const getStorage = (storage?: Storage) => storage ?? storageProvider.get();

export const toGcsFile = (file: GcsFileIdentifier | File, { storage }: { storage?: Storage } = {}) =>
  file instanceof File ? file : getStorage(storage).bucket(file.bucket).file(file.name);

export const toGcsFileIdentifier = (file: File): GcsFileIdentifier => ({
  bucket: file.bucket.name,
  name: file.name,
});

/**
 * Parse a gs:// type URI into bucket and object name.
 * @param uri the uri to parse - e.g. gs://my-bucket/my-object
 */
export const parseGcsUri = (uri: string): GcsFileIdentifier => {
  const match = uri.match(GS_BUCKET_AND_OBJECT_REGEX);
  if (!match || match.length !== 3) throw new BadRequestError(`${uri} is not a valid cloud storage URI`);
  return {
    bucket: match[1],
    name: match[2],
  };
};

export const toGcsUri = (src: File | GcsFileIdentifier, { storage }: { storage?: Storage } = {}) => {
  const file = toGcsFile(src, { storage });
  return `gs://${file.bucket.name}/${file.name}`;
};

export const gcsPathJoin = (...elements: string[]): string =>
  elements
    .map((str) => trim(str, "/"))
    .filter((e) => !!e)
    .join("/");

export const toGcsSaveOptions = ({
  publicReadable,
  contentType,
}: {
  publicReadable: boolean;
  contentType: string | undefined;
}): SaveOptions => {
  const defaultOptions = {
    resumable: false,
    ...(contentType ? { contentType } : undefined),
  };
  if (publicReadable) {
    return {
      ...defaultOptions,
      predefinedAcl: "publicRead",
      metadata: { cacheControl: "public, max-age=60" },
    };
  }
  return defaultOptions;
};

export const generateSignedDownloadUrl = async (
  src: File | GcsFileIdentifier,
  { expiryInMs = DEFAULT_SIGNED_URL_EXPIRY_MS, storage }: { expiryInMs?: number; storage?: Storage } = {}
) => {
  console.log("expiryMs", expiryInMs);
  const [url] = await toGcsFile(src, { storage: storage }).getSignedUrl({
    action: "read",
    expires: Date.now() + (expiryInMs ?? DEFAULT_SIGNED_URL_EXPIRY_MS),
  });
  return url;
};

export const makePublic = async (
  file: File | GcsFileIdentifier,
  { storage }: { storage?: Storage } = {}
): Promise<string> => {
  const src = toGcsFile(file, { storage });
  await src.makePublic();
  return src.publicUrl();
};

export const makePrivate = async (
  file: File | GcsFileIdentifier,
  { storage }: { storage?: Storage } = {}
): Promise<void> => {
  const src = toGcsFile(file, { storage });
  await src.makePrivate();
};
