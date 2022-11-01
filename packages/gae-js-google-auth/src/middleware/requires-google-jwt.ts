import { asArray, asyncMiddleware, createLogger, ForbiddenError, OneOrMany, runningOnGcp } from "@mondomob/gae-js-core";
import { Handler } from "express";
import { googleAuthClientProvider } from "../google-auth/google-auth-client-provider";

export interface JwtVerificationOptions {
  email?: OneOrMany<string>;
  audience?: OneOrMany<string>;
  disableForNonGcpEnvironment?: boolean;
}

export const requiresGoogleJwt = ({
  email,
  audience,
  disableForNonGcpEnvironment = true,
}: JwtVerificationOptions = {}): Handler => {
  const logger = createLogger("requiresGoogleJwt");

  const getTokenPayload = async (idToken: string) => {
    try {
      const ticket = await googleAuthClientProvider
        .get()
        .verifyIdToken({ idToken, audience: audience && asArray(audience) });
      return ticket.getPayload();
    } catch (e) {
      logger.error("Error extracting token payload.");
      throw new ForbiddenError();
    }
  };

  const validate: (expression: boolean, failureMessage: string) => asserts expression = (
    expression: boolean,
    failureMessage: string
  ) => {
    if (!expression) {
      logger.error(failureMessage);
      throw new ForbiddenError();
    }
  };

  return asyncMiddleware(async (req) => {
    if (disableForNonGcpEnvironment && !runningOnGcp()) {
      logger.info("Skipping google JWT validation on non-GCP environment");
      return;
    }

    const authHeader = req.header("Authorization");
    validate(!!authHeader, "No Authorization header present");
    const [, token] = authHeader.match(/Bearer (.*)/) ?? [];

    validate(!!token, "No valid bearer token found");

    const claims = await getTokenPayload(token);
    validate(!!claims, "Claims could not be extracted");
    validate(!!claims.email_verified, "Not a valid Google JWT: email_verified is not true");
    validate(claims.iss === "https://accounts.google.com", "Not a valid Google JWT: invalid issuer");
    if (email) {
      validate(
        !!claims.email && asArray(email).includes(claims.email),
        `JWT email ${claims.email} does not match one of the expected: ${email}`
      );
    }
  });
};
