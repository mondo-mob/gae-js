import { Handler } from "express";
import { Datastore } from "@google-cloud/datastore";
import { datastoreClientRequestStorage, datastoreLoaderRequestStorage } from "../datastore/datastore-request-storage";
import { DatastoreLoader } from "../datastore/datastore-loader";

/**
 * Creates a middleware that initialises a new DatastoreLoader into request storage
 * for each request from the provided Datastore instance.
 *
 * @param datastore datastore instance to use when creating Loader instances
 */
export const datastoreLoader = (datastore: Datastore): Handler => {
  return (req, res, next) => {
    datastoreClientRequestStorage.set(datastore);
    datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));
    next();
  };
};
