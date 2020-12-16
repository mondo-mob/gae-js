import { RequestStorageStore } from "@dotrun/gae-js-core";
import { FirestoreLoader } from "./firestore-loader";
import { Firestore } from "@google-cloud/firestore";

export const firestoreClientRequestStorage = new RequestStorageStore<Firestore>("_FIRESTORE_CLIENT");
export const firestoreLoaderRequestStorage = new RequestStorageStore<FirestoreLoader>("_FIRESTORE_LOADER");
