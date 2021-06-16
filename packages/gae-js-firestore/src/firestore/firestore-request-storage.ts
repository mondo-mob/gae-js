import { RequestStorageStore } from "@dotrun/gae-js-core";
import { FirestoreLoader } from "./firestore-loader";

export const firestoreLoaderRequestStorage = new RequestStorageStore<FirestoreLoader>("_FIRESTORE_LOADER");
