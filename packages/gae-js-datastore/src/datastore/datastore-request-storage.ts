import { RequestStorageStore } from "@mondomob/gae-js-core";
import { DatastoreLoader } from "./datastore-loader";

export const datastoreLoaderRequestStorage = new RequestStorageStore<DatastoreLoader>("_DATASTORE_LOADER");
