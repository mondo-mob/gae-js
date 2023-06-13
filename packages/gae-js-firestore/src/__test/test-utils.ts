import { CollectionReference } from "@google-cloud/firestore";
import { configurationProvider, runWithRequestStorage, zodValidator } from "@mondomob/gae-js-core";
import { GaeJsFirestoreConfiguration, gaeJsFirestoreConfigurationSchema } from "../configuration";
import { FirestoreLoader, firestoreLoaderRequestStorage, firestoreProvider } from "../firestore";
import { z } from "zod";

export const repositoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  prop1: z.string().optional(),
  prop2: z.string().optional(),
  prop3: z.string().optional(),
  date1: z.date().optional(),
  nested: z
    .object({
      prop4: z.string(),
      date2: z.date(),
    })
    .optional(),
});

export type RepositoryItem = z.infer<typeof repositoryItemSchema>;

export const initTestConfig = async (config: Record<string, unknown> = {}): Promise<GaeJsFirestoreConfiguration> => {
  await configurationProvider.init({
    validator: zodValidator(gaeJsFirestoreConfigurationSchema),
    projectId: "firestore-tests",
    overrides: config,
  });
  return configurationProvider.get<GaeJsFirestoreConfiguration>();
};

export const initEmulatorConfig = async (
  config?: Partial<GaeJsFirestoreConfiguration>
): Promise<GaeJsFirestoreConfiguration> => {
  return initTestConfig({
    firestoreProjectId: "firestore-tests",
    firestoreHost: "0.0.0.0",
    firestorePort: 9000,
    ...config,
  });
};

export const deleteCollection = async (collection: CollectionReference): Promise<void> => {
  await firestoreProvider.get().recursiveDelete(collection);
};

export const deleteCollections = async (collectionNames: string[]): Promise<void> => {
  for (const name of collectionNames) {
    await deleteCollection(firestoreProvider.get().collection(name));
  }
};

// Helper for standalone tests that require transaction support
export const transactional = (testFn: () => Promise<unknown>): jest.ProvidesCallback => {
  return () =>
    runWithRequestStorage(async () => {
      // We need firestore loader in request storage if we want to use gae-js transactions
      firestoreLoaderRequestStorage.set(new FirestoreLoader(firestoreProvider.get()));
      return testFn();
    });
};
