import { Firestore } from "@google-cloud/firestore";
import { FirestoreRepository } from "./firestore-repository";
import { connectFirestore, deleteCollection } from "./test-utils";
import { runInTransaction } from "./transactional";
import { runWithRequestStorage } from "@dotrun/gae-js-core";
import { firestoreLoaderRequestStorage } from "./firestore-request-storage";
import { FirestoreLoader } from "./firestore-loader";

interface RepositoryItem {
  id: string;
  name: string;
}

// TODO: beforePersist hook
// TODO: io-ts validation

describe("FirestoreRepository", () => {
  const collection = "repository-items";
  let firestore: Firestore;
  let repository: FirestoreRepository<RepositoryItem>;

  beforeAll(async () => (firestore = connectFirestore()));
  beforeEach(async () => {
    await deleteCollection(firestore.collection(collection));
    repository = new FirestoreRepository<RepositoryItem>(collection, { firestore });
    jest.clearAllMocks();
  });

  const createItem = (id: string, data?: Record<string, unknown>) => {
    return {
      id,
      name: `Test Item ${id}`,
      ...data,
    };
  };

  describe("get", () => {
    it("fetches document that exists", async () => {
      await firestore.doc(`${collection}/123`).create({
        name: "test123",
      });

      const document = await repository.get("123");

      expect(document).toEqual({
        id: "123",
        name: "test123",
      });
    });

    it("returns null for document that doesn't exist", async () => {
      const document = await repository.get("123");

      expect(document).toBe(null);
    });
  });

  describe("save", () => {
    it("saves documents outside of transaction", async () => {
      await repository.save([createItem("123"), createItem("234")]);

      const fetched = await repository.get(["123", "234"]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual({ id: "123", name: `Test Item 123` });
    });

    it("saves documents in transaction", async () => {
      await runWithRequestStorage(async () => {
        firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));
        return runInTransaction(() => repository.save([createItem("123"), createItem("234")]));
      });

      const fetched = await repository.get(["123", "234"]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual({ id: "123", name: `Test Item 123` });
    });

    it("overwrites document that already exists", async () => {
      await repository.save(createItem("123", { message: "create" }));
      await repository.save(createItem("123", { message: "save" }));

      const fetched = await repository.get("123");
      expect(fetched).toEqual({ id: "123", name: `Test Item 123`, message: "save" });
    });
  });

  // describe("delete", () => {
  //   it("deletes a document outside of transaction", async () => {
  //     await loader.create([createUserPayload("123")]);
  //     await loader.delete([firestore.doc("/users/123")]);
  //
  //     const doc = await firestore.doc("/users/123").get();
  //     expect(doc.exists).toBe(false);
  //   });
  //
  //   it("deletes a document in transaction", async () => {
  //     await loader.create([createUserPayload("123")]);
  //     await loader.inTransaction(async (txnLoader) => {
  //       await txnLoader.delete([firestore.doc("/users/123")]);
  //     });
  //
  //     const doc = await firestore.doc("/users/123").get();
  //     expect(doc.exists).toBe(false);
  //   });
  // });
  //
  // describe("query", () => {
  //   it("filters by exact match", async () => {
  //     await loader.create([
  //       createUserPayload("123", { message: "user1" }),
  //       createUserPayload("234", { message: "user2" }),
  //     ]);
  //
  //     const results = await loader.executeQuery("users", {
  //       filters: [
  //         {
  //           fieldPath: "message",
  //           opStr: "==",
  //           value: "user1",
  //         },
  //       ],
  //     });
  //
  //     expect(results.size).toBe(1);
  //     expect(results.docs[0].data().message).toEqual("user1");
  //   });
  // });
});
