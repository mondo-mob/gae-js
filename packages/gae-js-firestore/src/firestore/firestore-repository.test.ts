import { Firestore } from "@google-cloud/firestore";
import { iots as t, runWithRequestStorage } from "@mondomob/gae-js-core";
import { FirestoreLoader } from "./firestore-loader";
import { firestoreProvider } from "./firestore-provider";
import { FirestoreRepository } from "./firestore-repository";
import { firestoreLoaderRequestStorage } from "./firestore-request-storage";
import { connectFirestore, deleteCollection } from "./test-utils";
import { runInTransaction } from "./transactional";

const repositoryItemSchema = t.type({
  id: t.string,
  name: t.string,
});

interface RepositoryItem {
  id: string;
  name: string;
}

// TODO: beforePersist hook
// TODO: update

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

  describe("exists", () => {
    it("returns true when document exists", async () => {
      await firestore.doc(`${collection}/123`).create({
        name: "test123",
      });

      expect(await repository.exists("123")).toBe(true);
    });

    it("returns false when document does not exist", async () => {
      expect(await repository.exists("does-not-exist-123")).toBe(false);
    });
  });

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

    describe("with schema", () => {
      beforeEach(() => {
        repository = new FirestoreRepository<RepositoryItem>(collection, {
          firestore,
          validator: repositoryItemSchema,
        });
      });

      it("fetches document that exists and matches schema", async () => {
        await firestore.doc(`${collection}/123`).create({
          name: "test123",
        });

        const document = await repository.get("123");

        expect(document).toEqual({
          id: "123",
          name: "test123",
        });
      });

      it("throws for document that doesn't match schema", async () => {
        await firestore.doc(`${collection}/123`).create({
          description: "test123",
        });
        await expect(repository.get("123")).rejects.toThrow('"repository-items" with id "123" failed to load');
      });
    });

    describe("with firestore client in provider", () => {
      beforeEach(() => {
        firestoreProvider.set(firestore);
        repository = new FirestoreRepository<RepositoryItem>(collection);
      });

      it("fetches document that exists and matches schema", async () => {
        await firestore.doc(`${collection}/123`).create({
          name: "test123",
        });

        const document = await repository.get("123");

        expect(document).toEqual({
          id: "123",
          name: "test123",
        });
      });
    });
  });

  describe("getRequired", () => {
    it("fetches document that exists", async () => {
      await firestore.doc(`${collection}/123`).create({
        name: "test123",
      });

      const document = await repository.getRequired("123");

      expect(document).toEqual({
        id: "123",
        name: "test123",
      });
    });

    it("throws for document that doesn't exist", async () => {
      await expect(repository.getRequired("123")).rejects.toThrow("invalid id");
    });

    describe("with schema", () => {
      beforeEach(() => {
        repository = new FirestoreRepository<RepositoryItem>(collection, {
          firestore,
          validator: repositoryItemSchema,
        });
      });

      it("fetches document that exists and matches schema", async () => {
        await firestore.doc(`${collection}/123`).create({
          name: "test123",
        });

        const document = await repository.getRequired("123");

        expect(document).toEqual({
          id: "123",
          name: "test123",
        });
      });

      it("throws for document that doesn't match schema", async () => {
        await firestore.doc(`${collection}/123`).create({
          description: "test123",
        });
        await expect(repository.getRequired("123")).rejects.toThrow('"repository-items" with id "123" failed to load');
      });
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

    describe("with schema", () => {
      beforeEach(() => {
        repository = new FirestoreRepository<RepositoryItem>(collection, {
          firestore,
          validator: repositoryItemSchema,
        });
      });

      it("saves document outside of transaction that matches schema", async () => {
        await repository.save([createItem("123"), createItem("234")]);

        const fetched = await repository.get(["123", "234"]);
        expect(fetched.length).toBe(2);
        expect(fetched[0]).toEqual({ id: "123", name: `Test Item 123` });
      });

      it("throws for document that doesn't match schema", async () => {
        const abc = { id: "123", message: "no name" } as any as RepositoryItem;
        await expect(repository.save(abc)).rejects.toThrow('"repository-items" with id "123" failed to save');
      });
    });
  });

  describe("insert", () => {
    it("inserts documents outside of transaction", async () => {
      await repository.insert([createItem("123"), createItem("234")]);

      const fetched = await repository.get(["123", "234"]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual({ id: "123", name: `Test Item 123` });
    });

    it("inserts documents in transaction", async () => {
      await runWithRequestStorage(async () => {
        firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));
        return runInTransaction(() => repository.insert([createItem("123"), createItem("234")]));
      });

      const fetched = await repository.get(["123", "234"]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual({ id: "123", name: `Test Item 123` });
    });

    it("throws inserting document with id that already exists", async () => {
      await repository.insert(createItem("123", { message: "insert" }));
      await expect(repository.insert(createItem("123", { message: "insert again" }))).rejects.toThrow("ALREADY_EXISTS");
    });

    describe("with schema", () => {
      beforeEach(() => {
        repository = new FirestoreRepository<RepositoryItem>(collection, {
          firestore,
          validator: repositoryItemSchema,
        });
      });

      it("inserts documents outside of transaction that match schema", async () => {
        await repository.insert([createItem("123"), createItem("234")]);

        const fetched = await repository.get(["123", "234"]);
        expect(fetched.length).toBe(2);
        expect(fetched[0]).toEqual({ id: "123", name: `Test Item 123` });
      });

      it("throws for document that doesn't match schema", async () => {
        const abc = { id: "123", message: "no name" } as any as RepositoryItem;
        await expect(repository.insert(abc)).rejects.toThrow('"repository-items" with id "123" failed to save');
      });
    });
  });

  describe("delete", () => {
    it("deletes a document outside of transaction", async () => {
      await firestore.doc(`${collection}/123`).create({
        name: "test123",
      });

      await repository.delete("123");

      const doc = await firestore.doc(`${collection}/123`).get();
      expect(doc.exists).toBe(false);
    });

    it("deletes a document in transaction", async () => {
      await firestore.doc(`${collection}/123`).create({ name: "test123" });
      await firestore.doc(`${collection}/234`).create({ name: "test234" });

      await runWithRequestStorage(async () => {
        firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));
        return runInTransaction(() => repository.delete("123", "234"));
      });

      const doc123 = await firestore.doc(`${collection}/123`).get();
      expect(doc123.exists).toBe(false);
      const doc234 = await firestore.doc(`${collection}/234`).get();
      expect(doc234.exists).toBe(false);
    });
  });

  describe("query", () => {
    // TODO: selects specific fields
    // TODO: limit and offset
    // TODO: ordering
    it("filters by exact match", async () => {
      await repository.save([createItem("123"), createItem("234")]);

      const results = await repository.query({
        filters: [
          {
            fieldPath: "name",
            opStr: "==",
            value: "Test Item 234",
          },
        ],
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toEqual("Test Item 234");
    });
  });
});
