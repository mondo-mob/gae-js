import * as path from "path";
import { Handler } from "express";
import { generateHash } from "./utils";

/**
 * Handler to send a static file with md5 etag if response headers not already sent.
 * Hash generation is triggered on initialisation and then cached for use later.
 *
 * Intended to be used as a fallback/catchall handler - e.g. sending index.html for
 * a single page app.
 *
 * @example
 * app.use("/*", serveFallbackWithEtag({ file: "public/index.html" })
 */
export const serveFallbackWithEtag = (options: { file: string }): Handler => {
  const fullFilePath = path.join(__dirname, options.file);
  const hashPromise = generateHash(fullFilePath);

  return async (req, res, next) => {
    if (!res.headersSent) {
      const etag = await hashPromise;
      return res.sendFile(fullFilePath, { headers: { etag } }, (err) => {
        return err ? next(err) : next();
      });
    }
  };
};
