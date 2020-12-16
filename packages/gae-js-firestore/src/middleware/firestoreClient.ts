import { Handler } from "express";
import { Firestore } from "@google-cloud/firestore";
import { firestoreClientRequestStorage } from "../firestore/firestore-request-storage";

/**
 * Creates a middleware that sets the given Firestore Client into request storage for each request.
 *
 * @param firestore firestore client instance to use
 */
export const firestoreClient = (firestore: Firestore): Handler => {
  return (req, res, next) => {
    firestoreClientRequestStorage.set(firestore);
    next();
  };
};
