import {
  asyncMiddleware,
  createLogger,
  ForbiddenError,
  LazyProvider,
  OneOrMany,
  runningOnGcp,
} from "@mondomob/gae-js-core";
import { OAuth2Client } from "google-auth-library";
import { Handler } from "express";
import { castArray } from "lodash";

export const IAP_JWT_HEADER = "x-goog-iap-jwt-assertion";
export const IAP_JWT_ISSUER = "https://cloud.google.com/iap";

export interface IapJwtVerificationOptions {
  audience: OneOrMany<string>;
  disableForNonGcpEnvironment?: boolean;
}

export const requiresIapJwt = ({
  audience,
  disableForNonGcpEnvironment = true,
}: IapJwtVerificationOptions): Handler => {
  const logger = createLogger("requiresIapJwt");

  // Use lazy providers to reduce startup effort. They will only run once and only on first invocation.
  const authClientProvider = new LazyProvider(() => new OAuth2Client());
  const keysPromiseProvider = new LazyProvider(() => authClientProvider.get().getIapPublicKeys());

  return asyncMiddleware(async (req) => {
    if (disableForNonGcpEnvironment && !runningOnGcp()) {
      logger.info("Skipping IAP JWT validation on non-GCP environment");
      return;
    }

    const iapJwt = req.get(IAP_JWT_HEADER);
    if (!iapJwt) {
      logger.error("No IAP JWT header found - this should not happen if IAP enabled");
      throw new ForbiddenError();
    }

    try {
      const keys = await keysPromiseProvider.get();
      const ticket = await authClientProvider
        .get()
        .verifySignedJwtWithCertsAsync(iapJwt, keys.pubkeys, castArray(audience), [IAP_JWT_ISSUER]);
      logger.info(`Verified IAP JWT for user ${ticket.getPayload()?.email}`);
    } catch (e) {
      logger.error(e, "Error extracting token payload");
      throw new ForbiddenError();
    }
  });
};
