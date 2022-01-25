import { Firestore, Settings } from "@google-cloud/firestore";
import { Provider } from "@mondomob/gae-js-core";
import { connectFirestore } from "./connect";

export class FirestoreProvider extends Provider<Firestore> {
  init(firestoreOrSettings?: Firestore | Settings): void {
    if (firestoreOrSettings instanceof Firestore) {
      this.set(firestoreOrSettings);
    } else {
      this.set(connectFirestore({ firestoreSettings: firestoreOrSettings }));
    }
  }
}

export const firestoreProvider = new FirestoreProvider();
