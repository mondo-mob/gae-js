import { Handler } from "express";
import { App } from "firebase-admin/app";
import { DecodedIdToken, getAuth } from "firebase-admin/auth";
import { BaseUser, createLogger, UnauthorisedError, userRequestStorageProvider } from "@mondomob/gae-js-core";

const convertIdTokenToUser = async (idToken: DecodedIdToken): Promise<BaseUser> => ({
  id: idToken.uid,
  email: idToken.email,
  roles: idToken.roles || [],
});

export interface VerifyOptions {
  userConverter?: (idToken: DecodedIdToken) => Promise<BaseUser>;
}

export const verifyFirebaseUser = (firebaseAdmin: App, options?: VerifyOptions): Handler => {
  const logger = createLogger("verifyFirebaseUser");

  const userConverter = options?.userConverter || convertIdTokenToUser;

  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        logger.debug("Verifying Bearer token from Authorization header");
        const idToken = await getAuth().verifyIdToken(authHeader.substring(7));
        const user = await userConverter(idToken);
        logger.info(`Verified firebase token for user ${user.id} with roles ${user.roles}`);
        userRequestStorageProvider.get().set(user);
      } catch (e: any) {
        next(new UnauthorisedError(`Error verifying token: ${e.message}`));
      }
    } else {
      logger.debug("No Authorization header found");
    }
    next();
  };
};
