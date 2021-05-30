import { RequestStorageStore } from "@dotrun/gae-js-core";
import { DatastoreLoader } from "./datastore-loader";
import { Datastore } from "@google-cloud/datastore";

export const datastoreClientRequestStorage = new RequestStorageStore<Datastore>("_DATASTORE_CLIENT");
export const datastoreLoaderRequestStorage = new RequestStorageStore<DatastoreLoader>("_DATASTORE_LOADER");
