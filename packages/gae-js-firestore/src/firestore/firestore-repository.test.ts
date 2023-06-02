import { Firestore, GrpcStatus, Timestamp } from "@google-cloud/firestore";
import {
  IndexConfig,
  IndexEntry,
  Page,
  runWithRequestStorage,
  SearchFields,
  SearchService,
  Sort,
  zodValidator,
} from "@mondomob/gae-js-core";
import { toUpper } from "lodash";
import { z } from "zod";
import { connectFirestore, deleteCollection } from "../__test/test-utils";
import { FIRESTORE_ID_FIELD } from "./firestore-constants";
import { isFirestoreError } from "./firestore-errors";
import { FirestoreLoader } from "./firestore-loader";
import { firestoreProvider } from "./firestore-provider";
import { FirestoreRepository } from "./firestore-repository";
import { firestoreLoaderRequestStorage } from "./firestore-request-storage";
import { RepositoryNotFoundError } from "./repository-error";
import { runInTransaction } from "./transactional";
import { DateTransformers } from "./value-transformers";

const repositoryItemSchema = z.object({
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

const validator = zodValidator(repositoryItemSchema);

type RepositoryItem = z.infer<typeof repositoryItemSchema>;

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

    it("transforms Firestore Timestamps to Dates", async () => {
      const now = new Date();

      await firestore.doc(`${collection}/123`).create({
        name: "test123",
        date1: now,
      });

      const document = await repository.getRequired("123");

      expect(document.date1).toBeInstanceOf(Date);
      expect(document).toEqual({
        id: "123",
        name: "test123",
        date1: now,
      });
    });

    it("createEntity transforms Firestore Timestamps to Dates - nested plus arrays scenario", async () => {
      const now = new Timestamp(999, 888);
      const src: any = {
        name: "test123",
        date1: now,
        array1: ["1", now, {}],
        array2: [now, { event: 1, dt: now }, { event: 2, dt: now }],
        nested: {
          date2: now,
          nested: {
            prop1: "x",
            date3: now,
            array3: [now, now],
            array4: [now, { event: 3, sublist: [{ dt: now }] }],
          },
        },
      };
      expect(repository.createEntity("123", src)).toEqual({
        id: "123",
        name: "test123",
        date1: now.toDate(),
        array1: ["1", now.toDate(), {}],
        array2: [now.toDate(), { event: 1, dt: now.toDate() }, { event: 2, dt: now.toDate() }],
        nested: {
          date2: now.toDate(),
          nested: {
            prop1: "x",
            date3: now.toDate(),
            array3: [now.toDate(), now.toDate()],
            array4: [now.toDate(), { event: 3, sublist: [{ dt: now.toDate() }] }],
          },
        },
      });
    });

    it("transforms Firestore Timestamps to Dates - nested plus arrays scenario", async () => {
      const now = new Date();

      await firestore.doc(`${collection}/123`).create({
        name: "test123",
        date1: now,
        array1: ["1", now, {}],
        array2: [now, { event: 1, dt: now }, { event: 2, dt: now }],
        nested: {
          date2: now,
          nested: {
            prop1: "x",
            date3: now,
            array3: [now, now],
            array4: [now, { event: 3, sublist: [{ dt: now }] }],
          },
        },
      });

      const document = await repository.getRequired("123");

      expect(document.date1).toBeInstanceOf(Date);
      expect(document.nested?.date2).toBeInstanceOf(Date);
      expect(document).toEqual({
        id: "123",
        name: "test123",
        date1: now,
        array1: ["1", now, {}],
        array2: [now, { event: 1, dt: now }, { event: 2, dt: now }],
        nested: {
          date2: now,
          nested: {
            prop1: "x",
            date3: now,
            array3: [now, now],
            array4: [now, { event: 3, sublist: [{ dt: now }] }],
          },
        },
      });
    });

    it("subclass overrides the afterRead() hook", async () => {
      class TransformOnReadRepository<T extends RepositoryItem> extends FirestoreRepository<T> {
        protected afterRead(entity: T): T {
          // let the default Timestamp to Date conversation occur
          const transformed = super.afterRead(entity);
          // apply a further transform: simply uppercase the 'name' property
          transformed.name = toUpper(transformed.name);
          return transformed;
        }
      }

      const transformOnReadRepo = new TransformOnReadRepository(collection, { firestore });

      const now = new Date();
      await firestore.doc(`${collection}/123`).create({
        name: "test123",
        date1: now,
      });

      const document = await transformOnReadRepo.getRequired("123");
      expect(document.date1).toEqual(now);
      expect(document.name).toEqual("TEST123");
    });

    it("returns null for document that doesn't exist", async () => {
      const document = await repository.get("123");

      expect(document).toBe(null);
    });

    describe("with array", () => {
      it("returns array with items in same order", async () => {
        const now = new Date();

        await firestore.doc(`${collection}/123`).create({
          name: "test123",
          date1: now,
        });
        await firestore.doc(`${collection}/234`).create({
          name: "test234",
          date1: now,
        });

        const results = await repository.get(["123", "234"]);

        expect(results).toEqual([
          {
            id: "123",
            name: "test123",
            date1: now,
          },
          {
            id: "234",
            name: "test234",
            date1: now,
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
          validator,
        });
      });

      it("fetches document that exists and matches schema", async () => {
        const now = new Date();

        await firestore.doc(`${collection}/123`).create({
          name: "test123",
          date1: now,
        });

        const document = await repository.get("123");

        expect(document).toEqual({
          id: "123",
          name: "test123",
          date1: now,
        });
      });

      it("throws for document that doesn't match schema - unknown property", async () => {
        await firestore.doc(`${collection}/123`).create({
          description: "test123",
        });
        await expect(repository.get("123")).rejects.toThrow('"repository-items" with id "123" failed to load');
      });

      it("throws for document that doesn't match schema - incorrect type", async () => {
        await firestore.doc(`${collection}/123`).create({
          date1: "not-a-date",
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
          validator,
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

    it("saves and returns date fields", async () => {
      const fixedTime = new Date("2022-03-01T12:13:14.000Z");

      const result = await repository.save(createItem("123", { dateField: fixedTime }));

      const fetched = await repository.get("123");
      expect(result).toEqual(fetched);
      expect(fetched).toEqual({ id: "123", name: `Test Item 123`, dateField: fixedTime });
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
          validator,
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
        expect(isFirestoreError(err, GrpcStatus.ALREADY_EXISTS)).toBe(true);
      }
    });

    describe("with schema", () => {
      beforeEach(() => {
        repository = new FirestoreRepository<RepositoryItem>(collection, {
          firestore,
          validator,
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
        return runInTransaction(() => repository.delete(["123", "234"]));
      });

      const doc123 = await firestore.doc(`${collection}/123`).get();
      expect(doc123.exists).toBe(false);
      const doc234 = await firestore.doc(`${collection}/234`).get();
      expect(doc234.exists).toBe(false);
    });

    it("does not fail when document does not exist", async () => {
      await repository.delete("123");

      const doc = await firestore.doc(`${collection}/123`).get();
      expect(doc.exists).toBe(false);
    });

    it("fails when document does not exist, when precondition is specified", async () => {
      await expect(repository.delete("123", { exists: true })).rejects.toThrow(
        `NOT_FOUND: no entity to update: app: "dev~firestore-tests"`
      );
    });

    it("fails atomically when one document does not exist, when precondition is specified", async () => {
      await firestore.doc(`${collection}/123`).create({ name: "test123" });

      await expect(repository.delete(["123", "234"], { exists: true })).rejects.toThrow(
        `NOT_FOUND: no entity to update: app: "dev~firestore-tests"`
      );

      const doc = await firestore.doc(`${collection}/123`).get();
      expect(doc.exists).toBe(true);
    });
  });

  describe("deleteAll", () => {
    it("deletes all documents within a collection outside of transaction and clears loader state", async () => {
      await firestore.doc(`${collection}/123`).create({ name: "test123" });
      await firestore.doc(`${collection}/234`).create({ name: "test234" });

      await runWithRequestStorage(async () => {
        firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));
        expect((await firestore.collection(collection).get()).size).toBe(2);
        expect(await repository.get("123")).not.toBeNull();

        await repository.deleteAll();

        expect(await repository.get("123")).toBeNull();
      });

      expect((await firestore.collection(collection).get()).size).toBe(0);
    });

    it("throws error when within a transaction", async () => {
      await firestore.doc(`${collection}/123`).create({ name: "test123" });
      await firestore.doc(`${collection}/234`).create({ name: "test234" });

      expect((await firestore.collection(collection).get()).size).toBe(2);

      await expect(
        runWithRequestStorage(async () => {
          firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));
          return runInTransaction(() => repository.deleteAll());
        })
      ).rejects.toThrow("deleteAll is not supported from within a transaction");
    });

    it("ignores transaction and executes deleteAll outside transaction context when ignoreTransaction option is true", async () => {
      await firestore.doc(`${collection}/123`).create({ name: "test123" });
      await firestore.doc(`${collection}/234`).create({ name: "test234" });

      expect((await firestore.collection(collection).get()).size).toBe(2);

      await expect(
        runWithRequestStorage(async () => {
          firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));
          return runInTransaction(async () => {
            await repository.deleteAll({ ignoreTransaction: true });
            await repository.save({ id: "999", name: "this should be rolled back" });
            throw new Error("Error to force rollback");
          });
        })
      ).rejects.toThrow("Error to force rollback");

      // Delete not rolled back, but the save of new entity was
      expect((await firestore.collection(collection).get()).size).toBe(0);
      expect(await repository.get("999")).toBeNull();
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
          createItem("123", { prop1: "AA", prop2: "XX", nested: { prop3: 2 } }),
          createItem("234", { prop1: "BA", prop2: "XX", nested: { prop3: 1 } }),
          createItem("345", { prop1: "AB", prop2: "ZZ", nested: { prop3: 4 } }),
          createItem("456", { prop1: "BB", prop2: "YY", nested: { prop3: 5 } }),
          createItem("567", { prop1: "CA", prop2: "XX", nested: { prop3: 3 } }),
        ]);
      });

      it("orders results ascending", async () => {
        const results = await repository.query({
          sort: {
            fieldPath: "prop1",
            direction: "asc",
          },
        });

        expect(results.map(({ id }) => id)).toEqual(["123", "345", "234", "456", "567"]);
      });

      it("orders results descending", async () => {
        const results = await repository.query({
          sort: {
            fieldPath: "prop1",
            direction: "desc",
          },
        });

        expect(results.map(({ id }) => id)).toEqual(["567", "456", "234", "345", "123"]);
      });

      it("orders results by nested field ascending", async () => {
        const results = await repository.query({
          sort: {
            fieldPath: "nested.prop3",
            direction: "asc",
          },
        });

        expect(results.map(({ id }) => id)).toEqual(["234", "123", "567", "345", "456"]);
      });

      it("orders results by nested field descending", async () => {
        const results = await repository.query({
          sort: {
            fieldPath: "nested.prop3",
            direction: "desc",
          },
        });

        expect(results.map(({ id }) => id)).toEqual(["456", "345", "567", "123", "234"]);
      });

      it("orders by multiple fields", async () => {
        const results = await repository.query({
          sort: [
            {
              fieldPath: "prop2",
              direction: "asc",
            },
            {
              fieldPath: "prop1",
              direction: "desc",
            },
          ],
        });

        expect(results.map(({ id }) => id)).toEqual(["567", "234", "123", "456", "345"]);
      });

      it("orders results by id special key", async () => {
        const results = await repository.query({
          sort: [{ fieldPath: "prop2" }, { fieldPath: FIRESTORE_ID_FIELD }],
        });

        expect(results.map(({ id }) => id)).toEqual(["123", "234", "567", "456", "345"]);
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
          sort: { fieldPath: "name" },
          startAfter: ["Test Item 234"],
        });

        expect(results.length).toBe(3);
        expect(results[0].id).toEqual("345");
      });

      it("applies startAt", async () => {
        const results = await repository.query({
          sort: { fieldPath: "name" },
          startAt: ["Test Item 345"],
        });

        expect(results.length).toBe(3);
        expect(results[0].id).toEqual("345");
      });

      it("applies endBefore", async () => {
        const results = await repository.query({
          sort: { fieldPath: FIRESTORE_ID_FIELD },
          startAt: ["234"],
          endBefore: ["567"],
        });

        expect(results.length).toBe(3);
        expect(results[2].id).toEqual("456");
      });

      it("applies endAt", async () => {
        const results = await repository.query({
          sort: { fieldPath: FIRESTORE_ID_FIELD },
          startAfter: ["234"],
          endAt: ["567"],
        });

        expect(results.length).toBe(3);
        expect(results[2].id).toEqual("567");
      });

      it("applies multiple properties", async () => {
        const results = await repository.query({
          sort: [{ fieldPath: "prop1" }, { fieldPath: FIRESTORE_ID_FIELD }],
          startAfter: ["msg1", "345"],
          limit: 2,
        });

        expect(results.length).toBe(2);
        expect(results[0].id).toEqual("567");
        expect(results[1].id).toEqual("234");
      });

      it("applies cursor and limit", async () => {
        const results = await repository.query({
          sort: { fieldPath: FIRESTORE_ID_FIELD },
          startAfter: ["234"],
          limit: 2,
        });

        expect(results.length).toBe(2);
        expect(results[0].id).toEqual("345");
        expect(results[1].id).toEqual("456");
      });
    });
  });

  describe("queryForIds", () => {
    it("returns all matching id strings default sorted by id string value when no filters applied", async () => {
      await repository.save([createItem("1"), createItem("2"), createItem("3"), createItem("11")]);

      const ids = await repository.queryForIds();

      expect(ids).toEqual(["1", "11", "2", "3"]);
    });

    it("returns matching id strings matching filter and sorted by custom", async () => {
      await repository.save([
        createItem("1", { name: "ccc" }),
        createItem("2", { name: "bbb" }),
        createItem("3", { name: "excluded" }),
        createItem("11", { name: "aaa" }),
      ]);

      const ids = await repository.queryForIds({
        filters: [{ fieldPath: "name", opStr: "in", value: ["aaa", "bbb", "ccc"] }],
        sort: [{ fieldPath: "name" }],
      });

      expect(ids).toEqual(["11", "2", "1"]);
    });
  });

  describe("count", () => {
    describe("empty collection", () => {
      it("returns 0 when collection is empty", async () => {
        expect(await repository.count()).toBe(0);
      });
    });

    describe("with data", () => {
      beforeEach(async () => {
        await repository.save([
          createItem("1", { name: "aaa" }),
          createItem("2", { name: "aaa" }),
          createItem("3", { name: "aaa" }),
          createItem("4", { name: "zzz1" }),
          createItem("5", { name: "zzz2" }),
        ]);
      });

      it("counts all items in a collection by default", async () => {
        expect(await repository.count()).toBe(5);
      });

      it("counts all items matching filter", async () => {
        expect(
          await repository.count({
            filters: [{ fieldPath: "name", opStr: "==", value: "aaa" }],
          })
        ).toBe(3);
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
        valueTransformers: {
          // These are standard, but adding them explicitly for test visibility
          write: [DateTransformers.write()],
          read: [DateTransformers.read()],
        },
      });

    const fixedTime = new Date("2022-03-01T12:13:14.000Z");
    const createItem = (id: string): RepositoryItem => ({
      id,
      name: id,
      prop1: `${id}_prop1`,
      prop2: `${id}_prop2`,
      prop3: `${id}_prop3`,
      nested: {
        prop4: `${id}_prop4`,
        date2: fixedTime,
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

      it("indexes fields in repository config before transformation (single item)", async () => {
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
                date2: fixedTime,
              },
              custom: "custom_item1_prop3",
            },
          },
        ]);
      });

      it("indexes fields in repository config before transformation (multiple items)", async () => {
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
                date2: fixedTime,
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
                date2: fixedTime,
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
        await repository.delete(["item1", "item2"]);

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

    describe("with value transformers", () => {
      beforeEach(() => {
        repository = new FirestoreRepository<RepositoryItem>(collection, {
          firestore,
          valueTransformers: {
            read: [
              {
                test: ({ key }) => key === "prop4",
                transform: ({ src }) => `READ: ${src}`,
              },
            ],
            write: [
              {
                test: ({ key }) => key === "prop4",
                transform: ({ src }) => src.length,
              },
            ],
          },
        });
      });

      describe("get", () => {
        it("does not include default date conversion when custom transformers supplied", async () => {
          const now = new Date();

          await firestore.doc(`${collection}/123`).create({
            name: "test123",
            date1: now,
          });

          const document = await repository.getRequired("123");

          expect(document.date1).toBeInstanceOf(Timestamp);
          expect(document).toEqual({
            id: "123",
            name: "test123",
            date1: Timestamp.fromDate(now),
          });
        });
      });

      describe("save and get", () => {
        it("saves using transformer for prop4 and gets with transform", async () => {
          const now = new Date();

          const saveResult = await repository.save({
            id: "123",
            name: "test123",
            nested: {
              prop4: "convert-to-length-20",
              date2: now,
            },
          });

          const result = await firestore.doc(`${collection}/123`).get();
          expect(result.get("nested.prop4")).toBe(20);
          expect(result.get("name")).toBe("test123");

          const document = await repository.getRequired("123");
          expect(saveResult.nested?.prop4).toEqual(document.nested?.prop4);
          expect(document).toEqual({
            id: "123",
            name: "test123",
            nested: {
              prop4: "READ: 20",
              date2: Timestamp.fromDate(now),
            },
          });
        });
      });
    });
  });
});
