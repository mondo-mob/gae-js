import { GaeJsFirestoreConfiguration } from "../configuration";
import { deleteCollections, initEmulatorConfig } from "./test-utils";
import { connectFirestore, firestoreProvider } from "../firestore";

export interface FirestoreTestOptions {
  config?: Partial<GaeJsFirestoreConfiguration>;
  clearCollections?: string[];
  clearBefore?: boolean;
  clearAfter?: boolean;
}

export const useFirestoreTest = ({
  config: configOverrides,
  clearCollections = [],
  clearBefore = true,
  clearAfter = false,
}: FirestoreTestOptions = {}) => {
  beforeAll(async () => {
    await initEmulatorConfig(configOverrides);
    firestoreProvider.init();
    firestoreProvider.set(connectFirestore());
  });

  beforeEach(async () => {
    if (clearBefore) {
      await deleteCollections(clearCollections);
    }
  });

  afterEach(async () => {
    if (clearAfter) {
      await deleteCollections(clearCollections);
    }
  });
};
