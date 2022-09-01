import { BadRequestError } from "@mondomob/gae-js-core";

const gsBucketAndObjectRegex = /^gs:\/\/([A-Za-z0-9.\-_]+)\/(.*)$/;

/**
 * Parse a gs:// type URI into bucket and object.
 * @param uri the uri to parse - e.g. gs://my-bucket/my-object
 */
export const parseStorageUri = (uri: string): { bucket: string; objectName: string } => {
  const match = uri.match(gsBucketAndObjectRegex);
  if (!match || match.length !== 3) throw new BadRequestError(`${uri} is not a valid cloud storage URI`);
  return {
    bucket: match[1],
    objectName: match[2],
  };
};
