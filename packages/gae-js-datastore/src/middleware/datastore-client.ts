import { Handler } from "express";
import { Datastore } from "@google-cloud/datastore";
import { datastoreClientRequestStorage } from "../datastore/datastore-request-storage";

/**
 * Creates a middleware that sets the given Datastore Client into request storage for each request.
 *
 * @param datastore datastore client instance to use
 */
export const datastoreClient = (datastore: Datastore): Handler => {
  return (req, res, next) => {
    datastoreClientRequestStorage.set(datastore);
    next();
  };
};
