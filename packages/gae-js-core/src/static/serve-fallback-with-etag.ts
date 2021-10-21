import * as path from "path";
import { Handler } from "express";
import { generateHash } from "./utils";
import { createLogger } from "../logging";

/**
 * Handler to send a static file with md5 etag if response headers not already sent.
 * Hash generation is triggered on initialisation and then cached for use later.
 *
 * Intended to be used as a fallback/catchall handler - e.g. sending index.html for
 * a single page app.
 *
 * @example
 * app.use("/*", serveFallbackWithEtag(`${__dirname}/public/index.html`))
 */
export const serveFallbackWithEtag = (file: string): Handler => {
  const logger = createLogger("serveFallbackWithEtag");
  const fullFilePath = path.resolve(file);
  const hashPromise = generateHash(fullFilePath);

  return async (req, res, next) => {
    if (!res.headersSent) {
      const etag = `"${await hashPromise}"`;
      logger.info(`Sending file ${fullFilePath} with etag ${etag}`);
      return res.sendFile(fullFilePath, { headers: { etag }, lastModified: false }, (err) => {
        return err ? next(err) : next();
      });
    }
    next();
  };
};
