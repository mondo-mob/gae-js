import { Handler } from "express";
import { BaseUser, createLogger, UnauthorisedError, userRequestStorage } from "@dotrun/gae-js-core";
import * as firebaseAdmin from "firebase-admin";

const convertIdTokenToUser = (idToken: firebaseAdmin.auth.DecodedIdToken): BaseUser => ({
  id: idToken.uid,
  email: idToken.email,
  roles: idToken.roles || [],
});

export interface VerifyOptions {
  userConverter?: (idToken: firebaseAdmin.auth.DecodedIdToken) => BaseUser;
}

export const verifyFirebaseUser = (firebaseAdmin: firebaseAdmin.app.App, options?: VerifyOptions): Handler => {
  const logger = createLogger("firebaseAuthUser");

  const userConverter = options?.userConverter || convertIdTokenToUser;

  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        logger.debug("Verifying Bearer token from Authorization header");
        const idToken = await firebaseAdmin.auth().verifyIdToken(authHeader.substring(7));
        const user = userConverter(idToken);
        logger.info(`Verified firebase token for user ${user.id} with roles ${user.roles}`);
        userRequestStorage.set(user);
      } catch (e) {
        next(new UnauthorisedError(`Error verifying token: ${e.message}`));
      }
    } else {
      logger.debug("No Authorization header found");
    }
    next();
  };
};
