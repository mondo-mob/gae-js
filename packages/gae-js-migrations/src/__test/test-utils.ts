import { CollectionReference, Firestore, Settings } from "@google-cloud/firestore";
import { configurationProvider, runWithRequestStorage, zodValidator } from "@mondomob/gae-js-core";
import {
  FirestoreLoader,
  firestoreLoaderRequestStorage,
  firestoreProvider,
  GaeJsFirestoreConfiguration,
  gaeJsFirestoreConfigurationSchema,
} from "@mondomob/gae-js-firestore";
import ProvidesCallback = jest.ProvidesCallback;

export const initTestConfig = async (
  config?: Partial<GaeJsFirestoreConfiguration>
): Promise<GaeJsFirestoreConfiguration> => {
  process.env.GAEJS_PROJECT = "migration-tests";
  process.env.GAEJS_CONFIG_OVERRIDES = JSON.stringify({
    firestoreProjectId: "firestore-tests",
    firestoreHost: "0.0.0.0",
    firestorePort: 9000,
    ...config,
  });
  await configurationProvider.init({
    validator: zodValidator<GaeJsFirestoreConfiguration>(gaeJsFirestoreConfigurationSchema),
  });
  return configurationProvider.get<GaeJsFirestoreConfiguration>();
};

export const connectFirestore = (settings?: Settings): Firestore => {
  return new Firestore({
    projectId: "firestore-tests",
    host: "localhost",
    port: 9000,
    ssl: false,
    credentials: { client_email: "test@example.com", private_key: "{}" },
    ...settings,
  });
};

export const deleteCollection = async (collection: CollectionReference): Promise<void> => {
  const docs = await collection.limit(100).get();
  const batch = collection.firestore.batch();
  docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  if (docs.size === 100) {
    await deleteCollection(collection);
  }
};

export const deleteCollections = async (collectionNames: string[]): Promise<void> => {
  for (const name of collectionNames) {
    await deleteCollection(firestoreProvider.get().collection(name));
  }
};

export const useFirestoreTest = (collectionsToClear: string[] = []) => {
  beforeEach(async () => {
    await initTestConfig();
    firestoreProvider.set(connectFirestore());
    await deleteCollections(collectionsToClear);
  });
};

// Helper for standalone tests that require transaction support
export const transactional = (testFn: () => Promise<unknown>): ProvidesCallback => {
  return () =>
    runWithRequestStorage(async () => {
      // We need firestore loader in request storage if we want to use gae-js transactions
      firestoreLoaderRequestStorage.set(new FirestoreLoader(firestoreProvider.get()));
      return testFn();
    });
};
