import { Firestore } from "@google-cloud/firestore";
import { StatusCode } from "@google-cloud/firestore/build/src/status-code";
import {
  IndexConfig,
  IndexEntry,
  iots as t,
  Page,
  runWithRequestStorage,
  SearchFields,
  SearchService,
  Sort,
} from "@mondomob/gae-js-core";
import { FIRESTORE_ID_FIELD } from "./firestore-constants";
import { isFirestoreError } from "./firestore-errors";
import { FirestoreLoader } from "./firestore-loader";
import { firestoreProvider } from "./firestore-provider";
import { FirestoreRepository } from "./firestore-repository";
import { firestoreLoaderRequestStorage } from "./firestore-request-storage";
import { connectFirestore, deleteCollection } from "../__test/test-utils";
import { RepositoryNotFoundError } from "./repository-error";
import { runInTransaction } from "./transactional";

const repositoryItemSchema = t.intersection([
  t.type({
    id: t.string,
    name: t.string,
  }),
  t.partial({
    prop1: t.string,
    prop2: t.string,
    prop3: t.string,
    nested: t.type({
      prop4: t.string,
    }),
  }),
]);

type RepositoryItem = t.TypeOf<typeof repositoryItemSchema>;

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

    describe("with array", () => {
      it("returns array with items in same order", async () => {
        await firestore.doc(`${collection}/123`).create({
          name: "test123",
        });
        await firestore.doc(`${collection}/234`).create({
          name: "test234",
        });

        const results = await repository.get(["123", "234"]);

        expect(results).toEqual([
          {
            id: "123",
            name: "test123",
          },
          {
            id: "234",
            name: "test234",
          },
        ]);
      });

      it("returns array null entries for docs that don't exist", async () => {
        await firestore.doc(`${collection}/123`).create({
          name: "test123",
        });

        const results = await repository.get(["not-exists-1", "123", "not-exists-2"]);

        expect(results).toEqual([
          null,
          {
            id: "123",
            name: "test123",
          },
          null,
        ]);
      });
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
      await expect(repository.getRequired("123")).rejects.toThrowError(new RepositoryNotFoundError(collection, "123"));
    });

    describe("with array", () => {
      it("fetches documents that exist", async () => {
        await firestore.doc(`${collection}/123`).create({
          name: "test123",
        });
        await firestore.doc(`${collection}/234`).create({
          name: "test234",
        });

        const results = await repository.getRequired(["123", "234"]);

        expect(results).toEqual([
          {
            id: "123",
            name: "test123",
          },
          {
            id: "234",
            name: "test234",
          },
        ]);
      });

      it("throws for any document that doesn't exist", async () => {
        await firestore.doc(`${collection}/123`).create({
          name: "test123",
        });

        await expect(repository.getRequired(["123", "does-not-exist", "also-does-not-exist"])).rejects.toThrow(
          '"repository-items" with id "does-not-exist" failed to load'
        );
      });
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

    it("throws inserting document with id that already exists, matching error expectation", async () => {
      await repository.insert(createItem("123", { message: "insert" }));
      try {
        await repository.insert(createItem("123", { message: "insert again" }));
        fail("Expected error");
      } catch (err) {
        expect(isFirestoreError(err, StatusCode.ALREADY_EXISTS)).toBe(true);
      }
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

  describe("deleteAll", () => {
    it("deletes all documents within a collection outside of transaction", async () => {
      await firestore.doc(`${collection}/123`).create({ name: "test123" });
      await firestore.doc(`${collection}/234`).create({ name: "test234" });

      expect((await firestore.collection(collection).get()).size).toBe(2);

      await repository.deleteAll();

      expect((await firestore.collection(collection).get()).size).toBe(0);
    });

    it("deletes all documents within a collection in transaction", async () => {
      await firestore.doc(`${collection}/123`).create({ name: "test123" });
      await firestore.doc(`${collection}/234`).create({ name: "test234" });

      expect((await firestore.collection(collection).get()).size).toBe(2);

      await runWithRequestStorage(async () => {
        firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));
        return runInTransaction(() => repository.deleteAll());
      });

      expect((await firestore.collection(collection).get()).size).toBe(0);
    });
  });

  describe("query", () => {
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

    it("selects specific fields", async () => {
      await repository.save([
        createItem("123", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }),
        createItem("234", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }),
      ]);

      const results = await repository.query({
        select: ["prop1", "prop3"],
      });

      expect(results.length).toBe(2);
      expect(results[0].prop1).toEqual("prop1");
      expect(results[0].prop2).toBeUndefined();
      expect(results[0].prop3).toEqual("prop3");
    });

    it("selects ids only when empty projection query", async () => {
      await repository.save([
        createItem("123", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }),
        createItem("234", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }),
      ]);
      const results = await repository.query({ select: [] });

      expect(results).toEqual([{ id: "123" }, { id: "234" }]);
    });

    it("selects ids only when FIRESTORE_ID_FIELD projection query", async () => {
      await repository.save([
        createItem("123", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }),
        createItem("234", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }),
      ]);
      const results = await repository.query({ select: [FIRESTORE_ID_FIELD] });

      expect(results).toEqual([{ id: "123" }, { id: "234" }]);
    });

    describe("limit and offset", () => {
      beforeEach(async () => {
        await repository.save([
          createItem("123", { prop1: "user1" }),
          createItem("234", { prop1: "user2" }),
          createItem("345", { prop1: "user3" }),
          createItem("456", { prop1: "user4" }),
          createItem("567", { prop1: "user5" }),
        ]);
      });

      it("applies limit", async () => {
        const results = await repository.query({
          limit: 3,
        });

        expect(results.length).toBe(3);
      });

      it("applies offset", async () => {
        const results = await repository.query({
          offset: 3,
        });

        expect(results.length).toBe(2);
        expect(results[0].id).toEqual("456");
      });

      it("applies limit and offset", async () => {
        const results = await repository.query({
          limit: 2,
          offset: 2,
        });

        expect(results.length).toBe(2);
        expect(results[0].id).toEqual("345");
        expect(results[1].id).toEqual("456");
      });
    });

    describe("ordering", () => {
      beforeEach(async () => {
        await repository.save([
          createItem("123", { prop1: "AA", prop2: "XX" }),
          createItem("234", { prop1: "BA", prop2: "XX" }),
          createItem("345", { prop1: "AB", prop2: "ZZ" }),
          createItem("456", { prop1: "BB", prop2: "YY" }),
          createItem("567", { prop1: "CA", prop2: "XX" }),
        ]);
      });

      it("orders results ascending", async () => {
        const results = await repository.query({
          sort: {
            property: "prop1",
            direction: "asc",
          },
        });

        expect(results.length).toBe(5);
        expect(results.map((doc) => doc.id)).toEqual(["123", "345", "234", "456", "567"]);
      });

      it("orders results descending", async () => {
        const results = await repository.query({
          sort: {
            property: "prop1",
            direction: "desc",
          },
        });

        expect(results.length).toBe(5);
        expect(results.map((doc) => doc.id)).toEqual(["567", "456", "234", "345", "123"]);
      });

      it("orders by multiple fields", async () => {
        const results = await repository.query({
          sort: [
            {
              property: "prop2",
              direction: "asc",
            },
            {
              property: "prop1",
              direction: "desc",
            },
          ],
        });

        expect(results.length).toBe(5);
        expect(results.map((doc) => doc.id)).toEqual(["567", "234", "123", "456", "345"]);
      });

      it("orders results by id special key", async () => {
        const results = await repository.query({
          sort: [{ property: "prop2" }, { property: FIRESTORE_ID_FIELD }],
        });

        expect(results.length).toBe(5);
        expect(results.map((doc) => doc.id)).toEqual(["123", "234", "567", "456", "345"]);
      });
    });

    describe("cursors", () => {
      beforeEach(async () => {
        await repository.save([
          createItem("123", { prop1: "msg1" }),
          createItem("234", { prop1: "msg2" }),
          createItem("345", { prop1: "msg1" }),
          createItem("456", { prop1: "msg2" }),
          createItem("567", { prop1: "msg1" }),
        ]);
      });

      it("applies startAfter", async () => {
        const results = await repository.query({
          sort: { property: "name" },
          startAfter: ["Test Item 234"],
        });

        expect(results.length).toBe(3);
        expect(results[0].id).toEqual("345");
      });

      it("applies startAt", async () => {
        const results = await repository.query({
          sort: { property: "name" },
          startAt: ["Test Item 345"],
        });

        expect(results.length).toBe(3);
        expect(results[0].id).toEqual("345");
      });

      it("applies endBefore", async () => {
        const results = await repository.query({
          sort: { property: FIRESTORE_ID_FIELD },
          startAt: ["234"],
          endBefore: ["567"],
        });

        expect(results.length).toBe(3);
        expect(results[2].id).toEqual("456");
      });

      it("applies endAt", async () => {
        const results = await repository.query({
          sort: { property: FIRESTORE_ID_FIELD },
          startAfter: ["234"],
          endAt: ["567"],
        });

        expect(results.length).toBe(3);
        expect(results[2].id).toEqual("567");
      });

      it("applies multiple properties", async () => {
        const results = await repository.query({
          sort: [{ property: "prop1" }, { property: FIRESTORE_ID_FIELD }],
          startAfter: ["msg1", "345"],
          limit: 2,
        });

        expect(results.length).toBe(2);
        expect(results[0].id).toEqual("567");
        expect(results[1].id).toEqual("234");
      });

      it("applies cursor and limit", async () => {
        const results = await repository.query({
          sort: { property: FIRESTORE_ID_FIELD },
          startAfter: ["234"],
          limit: 2,
        });

        expect(results.length).toBe(2);
        expect(results[0].id).toEqual("345");
        expect(results[1].id).toEqual("456");
      });
    });
  });

  describe("with search enabled", () => {
    const searchService: SearchService = {
      index: jest.fn(),
      delete: jest.fn(),
      deleteAll: jest.fn(),
      query: jest.fn(),
    };

    const initRepo = (indexConfig: IndexConfig<RepositoryItem>): FirestoreRepository<RepositoryItem> =>
      new FirestoreRepository<RepositoryItem>(collection, {
        firestore,
        search: {
          searchService: searchService,
          indexName: "item",
          indexConfig,
        },
      });

    const createItem = (id: string): RepositoryItem => ({
      id,
      name: id,
      prop1: `${id}_prop1`,
      prop2: `${id}_prop2`,
      prop3: `${id}_prop3`,
      nested: {
        prop4: `${id}_prop4`,
      },
    });

    beforeEach(() => {
      jest.resetAllMocks();
      repository = initRepo({
        prop1: true,
        prop2: (value) => value.prop2?.toUpperCase(),
        nested: true,
        custom: (value) => `custom_${value.prop3}`,
      });
    });

    const itIndexesEntitiesForOperation = (operation: string) => {
      const verifyIndexEntries = (entries: IndexEntry[]) => {
        expect(searchService.index).toHaveBeenCalledWith("item", entries);
      };

      it("indexes fields in repository config (single item)", async () => {
        const item = createItem("item1");

        await (repository as any)[operation](item);

        verifyIndexEntries([
          {
            id: "item1",
            fields: {
              prop1: "item1_prop1",
              prop2: "ITEM1_PROP2",
              nested: {
                prop4: "item1_prop4",
              },
              custom: "custom_item1_prop3",
            },
          },
        ]);
      });

      it("indexes fields in repository config (multiple items)", async () => {
        const item1 = createItem("item1");
        const item2 = createItem("item2");

        await (repository as any)[operation]([item1, item2]);

        verifyIndexEntries([
          {
            id: "item1",
            fields: {
              prop1: "item1_prop1",
              prop2: "ITEM1_PROP2",
              nested: {
                prop4: "item1_prop4",
              },
              custom: "custom_item1_prop3",
            },
          },
          {
            id: "item2",
            fields: {
              prop1: "item2_prop1",
              prop2: "ITEM2_PROP2",
              nested: {
                prop4: "item2_prop4",
              },
              custom: "custom_item2_prop3",
            },
          },
        ]);
      });
    };

    describe("save", () => {
      itIndexesEntitiesForOperation("save");
    });

    describe("insert", () => {
      itIndexesEntitiesForOperation("insert");
    });

    describe("delete", () => {
      it("requests index deletion (single item)", async () => {
        await repository.delete("item1");

        expect(searchService.delete).toHaveBeenCalledWith("item", "item1");
      });

      it("requests index deletion (multiple items)", async () => {
        await repository.delete("item1", "item2");

        expect(searchService.delete).toHaveBeenCalledWith("item", "item1", "item2");
      });
    });

    describe("deleteAll", () => {
      it("requests search index deletion of all items", async () => {
        await repository.deleteAll();

        expect(searchService.deleteAll).toHaveBeenCalledWith("item");
      });
    });

    describe("search", () => {
      it("searches and fetches results", async () => {
        const searchFields: SearchFields = {
          prop1: "prop1",
        };
        const sort: Sort = {
          field: "prop1",
        };
        const page: Page = {
          limit: 10,
          offset: 10,
        };

        (searchService as any).query.mockImplementation(async () => ({
          resultCount: 2,
          limit: 10,
          offset: 10,
          ids: ["item1", "item2"],
        }));

        await repository.save([createItem("item1"), createItem("item2")]);

        const results = await repository.search(searchFields, sort, page);

        expect(results).toEqual({
          resultCount: 2,
          limit: 10,
          offset: 10,
          results: expect.arrayContaining([
            expect.objectContaining({ id: "item1" }),
            expect.objectContaining({ id: "item2" }),
          ]),
        });
      });
    });
  });
});
