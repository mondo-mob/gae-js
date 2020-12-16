import { CollectionReference, Firestore } from "@google-cloud/firestore";

// TODO: where to define these?
const projectId = "integration-tests";
const host = "localhost";
const port = 8090;

export interface RepositoryItem {
  id: string;
  name: string;
}

export const connectFirestore = (): Firestore => {
  return new Firestore({
    projectId,
    host,
    port,
    ssl: false,
    credentials: { client_email: "test@example.com", private_key: "{}" },
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
