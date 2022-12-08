import { FIRESTORE_ID_FIELD } from "./firestore-constants";
import { FirestoreLoader } from "./firestore-loader";
import { Firestore } from "@google-cloud/firestore";
import { connectFirestore, deleteCollection } from "../__test/test-utils";
import assert from "assert";

describe("FirestoreLoader", () => {
  let firestore: Firestore;
  let loader: FirestoreLoader;

  beforeAll(async () => (firestore = connectFirestore()));
  beforeEach(async () => {
    await deleteCollection(firestore.collection("users"));
    loader = new FirestoreLoader(firestore);
    jest.clearAllMocks();
  });

  const createUserData = (id: string, data?: Record<string, unknown>) => ({
    name: `Test User ${id}`,
    ...data,
  });

  const createUserPayload = (id: string, data?: Record<string, unknown>) => ({
    ref: firestore.doc(`/users/${id}`),
    data: createUserData(id, data),
  });

  describe("get", () => {
    it("fetches from firestore on first request", async () => {
      await firestore.doc("/users/123").create(createUserData("123"));
      const getAllSpy = jest.spyOn(firestore, "getAll");
      const ref = firestore.doc("/users/123");

      await loader.get([ref]);

      expect(getAllSpy).toBeCalledTimes(1);
    });

    it("should fetch data from cache", async () => {
      await firestore.doc("/users/123").create(createUserData("123"));
      const getAllSpy = jest.spyOn(firestore, "getAll");
      const ref = firestore.doc("/users/123");

      const doc1 = await loader.get([ref]);
      const doc2 = await loader.get([ref]);

      expect(doc1).toEqual(doc2);
      expect(getAllSpy).toBeCalledTimes(1);
    });

    it("should return copy of data when loading from cache", async () => {
      await firestore.doc("/users/123").create(createUserData("123"));
      const getAllSpy = jest.spyOn(firestore, "getAll");
      const ref = firestore.doc("/users/123");

      const [doc1] = await loader.get([ref]);
      assert.ok(doc1);
      // If we change a property on the returned document it should not affect the cached version
      doc1.name = "Changed name";
      const [doc2] = await loader.get([ref]);

      expect(getAllSpy).toBeCalledTimes(1);
      expect(doc2).toEqual({ name: "Test User 123" });
    });
  });

  describe("create", () => {
    it("creates documents outside of transaction", async () => {
      await loader.create([createUserPayload("123"), createUserPayload("234")]);
      const fetched = await firestore.getAll(firestore.doc("/users/123"), firestore.doc("/users/234"));
      expect(fetched.length).toBe(2);
      expect(fetched[0].data()).toEqual({ name: `Test User 123` });
    });

    it("creates documents in transaction", async () => {
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.create([createUserPayload("456"), createUserPayload("789")]);
      });

      const fetched = await firestore.getAll(firestore.doc("/users/456"), firestore.doc("/users/789"));
      expect(fetched.length).toBe(2);
      expect(fetched[0].data()).toEqual({ name: `Test User 456` });
    });

    it("rejects for document that already exists", async () => {
      await loader.create([createUserPayload("123")]);
      await expect(loader.create([createUserPayload("123")])).rejects.toThrow("ALREADY_EXISTS");
    });

    it("populates cache", async () => {
      const original = createUserPayload("123");
      const getAllSpy = jest.spyOn(firestore, "getAll");

      await loader.create([original]);
      const [doc1] = await loader.get([original.ref]);

      expect(doc1).toEqual(original.data);
      expect(getAllSpy).toBeCalledTimes(0);
    });

    it("should not pollute cache when changing original document", async () => {
      const original = createUserPayload("123");
      const getAllSpy = jest.spyOn(firestore, "getAll");

      await loader.create([original]);
      // If we change a property on the original it should not change cache
      original.data.name = "Changed name";

      const [doc1] = await loader.get([original.ref]);
      assert.ok(doc1);
      expect(getAllSpy).toBeCalledTimes(0);
      expect(doc1).toEqual({ name: `Test User 123` });
    });
  });

  describe("set", () => {
    it("should set documents outside of transaction", async () => {
      await loader.set([createUserPayload("123"), createUserPayload("234")]);
      const fetched = await firestore.getAll(firestore.doc("/users/123"), firestore.doc("/users/234"));
      expect(fetched.length).toBe(2);
      expect(fetched[0].data()).toEqual({ name: `Test User 123` });
    });

    it("should set documents in transaction", async () => {
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.set([createUserPayload("456"), createUserPayload("789")]);
      });

      const fetched = await firestore.getAll(firestore.doc("/users/456"), firestore.doc("/users/789"));
      expect(fetched.length).toBe(2);
      expect(fetched[0].data()).toEqual({ name: `Test User 456` });
    });

    it("populates cache", async () => {
      const original = createUserPayload("123");
      const getAllSpy = jest.spyOn(firestore, "getAll");

      await loader.set([original]);
      const [doc1] = await loader.get([original.ref]);

      expect(doc1).toEqual(original.data);
      expect(getAllSpy).toBeCalledTimes(0);
    });

    it("overwrites document that already exists and updates cache", async () => {
      await loader.create([createUserPayload("123", { message: "create" })]);
      await loader.set([createUserPayload("123", { message: "set" })]);

      const fetchedDirect = await firestore.doc("/users/123").get();
      expect(fetchedDirect.data()).toEqual({ name: `Test User 123`, message: "set" });

      const fetchedCache = await loader.get([firestore.doc("/users/123")]);
      expect(fetchedCache[0]).toEqual({ name: `Test User 123`, message: "set" });
    });

    it("clears stale cache value after transaction completes", async () => {
      await loader.create([createUserPayload("123", { message: "create" })]);
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.set([createUserPayload("123", { message: "set" })]);
      });

      const fetchedDirect = await firestore.doc("/users/123").get();
      expect(fetchedDirect.data()).toEqual({ name: `Test User 123`, message: "set" });

      const fetchedLoader = await loader.get([firestore.doc("/users/123")]);
      expect(fetchedLoader[0]).toEqual({ name: `Test User 123`, message: "set" });
    });

    it("should not pollute cache when changing original document", async () => {
      const original = createUserPayload("123");
      const getAllSpy = jest.spyOn(firestore, "getAll");

      await loader.set([original]);
      // If we change a property on the original it should not change cache
      original.data.name = "Changed name";

      const [doc1] = await loader.get([original.ref]);
      expect(getAllSpy).toBeCalledTimes(0);
      expect(doc1).toEqual({ name: "Test User 123" });
    });
  });

  describe("delete", () => {
    it("deletes a document outside of transaction", async () => {
      await loader.create([createUserPayload("123")]);
      await loader.delete([firestore.doc("/users/123")]);

      const doc = await firestore.doc("/users/123").get();
      expect(doc.exists).toBe(false);
    });

    it("deletes a document in transaction", async () => {
      await loader.create([createUserPayload("123")]);
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.delete([firestore.doc("/users/123")]);
      });

      const doc = await firestore.doc("/users/123").get();
      expect(doc.exists).toBe(false);
    });

    it("deletes document and removes from cache", async () => {
      await loader.create([createUserPayload("123")]);
      await loader.delete([firestore.doc("/users/123")]);

      const fetchedCache = await loader.get([firestore.doc("/users/123")]);
      expect(fetchedCache).toEqual([null]);
    });

    it("clears stale cache value after transaction completes", async () => {
      await loader.create([createUserPayload("123")]);
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.delete([firestore.doc("/users/123")]);
      });

      const fetchedLoader = await loader.get([firestore.doc("/users/123")]);
      expect(fetchedLoader).toEqual([null]);
    });
  });

  describe("query", () => {
    it("selects specific fields", async () => {
      await loader.create([
        createUserPayload("123", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }),
        createUserPayload("234", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }),
      ]);

      const results = await loader.executeQuery("users", {
        select: ["prop1", "prop3"],
      });

      expect(results.size).toBe(2);
      expect(results.docs[0].data().prop1).toEqual("prop1");
      expect(results.docs[0].data().prop2).toBeUndefined();
      expect(results.docs[0].data().prop3).toEqual("prop3");
    });

    it("populates cache with results when all fields returned", async () => {
      const getAllSpy = jest.spyOn(firestore, "getAll");
      const ref = firestore.doc("/users/123");
      await ref.create({ prop1: "prop1" });

      const results = await loader.executeQuery("users", {});
      const doc = await loader.get([ref]);

      expect(results.docs[0].data()).toEqual({ prop1: "prop1" });
      expect(doc[0]).toEqual({ prop1: "prop1" });
      expect(getAllSpy).toBeCalledTimes(0);
    });

    it("doesn't update cache with results when only some fields requested", async () => {
      const getAllSpy = jest.spyOn(firestore, "getAll");
      const ref = firestore.doc("/users/123");
      await ref.create({ prop1: "prop1", prop2: "prop2", prop3: "prop3" });

      const results = await loader.executeQuery("users", {
        select: ["prop1", "prop3"],
      });
      const doc = await loader.get([ref]);

      expect(results.docs[0].data()).toEqual({ prop1: "prop1", prop3: "prop3" });
      expect(doc[0]).toEqual({ prop1: "prop1", prop2: "prop2", prop3: "prop3" });
      expect(getAllSpy).toBeCalledTimes(1);
    });

    it("should not pollute cache when changing original document", async () => {
      const getAllSpy = jest.spyOn(firestore, "getAll");
      const ref = firestore.doc("/users/123");
      await ref.create({ name: "Original name" });

      const results = await loader.executeQuery("users", {});
      const doc1 = results.docs[0].data();
      // If we change a property on the returned document it should not affect the cached version
      doc1.name = "Changed name";
      const [doc2] = await loader.get([ref]);

      expect(getAllSpy).toBeCalledTimes(0);
      expect(doc2).toEqual({ name: "Original name" });
    });

    it("filters by exact match", async () => {
      await loader.create([
        createUserPayload("123", { message: "user1" }),
        createUserPayload("234", { message: "user2" }),
      ]);

      const results = await loader.executeQuery("users", {
        filters: [
          {
            fieldPath: "message",
            opStr: "==",
            value: "user1",
          },
        ],
      });

      expect(results.size).toBe(1);
      expect(results.docs[0].data().message).toEqual("user1");
    });

    describe("limit and offset", () => {
      beforeEach(async () => {
        await loader.create([
          createUserPayload("123", { message: "user1" }),
          createUserPayload("234", { message: "user2" }),
          createUserPayload("345", { message: "user3" }),
          createUserPayload("456", { message: "user4" }),
          createUserPayload("567", { message: "user5" }),
        ]);
      });

      it("applies limit", async () => {
        const results = await loader.executeQuery("users", {
          limit: 3,
        });

        expect(results.size).toBe(3);
      });

      it("applies offset", async () => {
        const results = await loader.executeQuery("users", {
          offset: 3,
        });

        expect(results.size).toBe(2);
        expect(results.docs[0].id).toEqual("456");
      });

      it("applies limit and offset", async () => {
        const results = await loader.executeQuery("users", {
          limit: 2,
          offset: 2,
        });

        expect(results.size).toBe(2);
        expect(results.docs[0].id).toEqual("345");
        expect(results.docs[1].id).toEqual("456");
      });
    });

    describe("ordering", () => {
      beforeEach(async () => {
        await loader.create([
          createUserPayload("123", { category1: "AA", category2: "XX", nested: { prop3: 2 } }),
          createUserPayload("234", { category1: "BA", category2: "XX", nested: { prop3: 1 } }),
          createUserPayload("345", { category1: "AB", category2: "ZZ", nested: { prop3: 4 } }),
          createUserPayload("456", { category1: "BB", category2: "YY", nested: { prop3: 5 } }),
          createUserPayload("567", { category1: "CA", category2: "XX", nested: { prop3: 3 } }),
        ]);
      });

      it("orders results ascending", async () => {
        const results = await loader.executeQuery("users", {
          sort: {
            fieldPath: "category1",
            direction: "asc",
          },
        });

        expect(results.docs.map(({ id }) => id)).toEqual(["123", "345", "234", "456", "567"]);
      });

      it("orders results descending", async () => {
        const results = await loader.executeQuery("users", {
          sort: {
            fieldPath: "category1",
            direction: "desc",
          },
        });

        expect(results.docs.map(({ id }) => id)).toEqual(["567", "456", "234", "345", "123"]);
      });

      it("orders by multiple fields", async () => {
        const results = await loader.executeQuery("users", {
          sort: [
            {
              fieldPath: "category2",
              direction: "asc",
            },
            {
              fieldPath: "category1",
              direction: "desc",
            },
          ],
        });

        expect(results.docs.map(({ id }) => id)).toEqual(["567", "234", "123", "456", "345"]);
      });

      it("orders results by nested field ascending", async () => {
        const results = await loader.executeQuery("users", {
          sort: {
            fieldPath: "nested.prop3",
            direction: "asc",
          },
        });

        expect(results.docs.map(({ id }) => id)).toEqual(["234", "123", "567", "345", "456"]);
      });

      it("orders results by nested field descending", async () => {
        const results = await loader.executeQuery("users", {
          sort: {
            fieldPath: "nested.prop3",
            direction: "desc",
          },
        });

        expect(results.docs.map(({ id }) => id)).toEqual(["456", "345", "567", "123", "234"]);
      });

      it("orders results by id special key", async () => {
        const results = await loader.executeQuery("users", {
          sort: [{ fieldPath: "category2" }, { fieldPath: FIRESTORE_ID_FIELD }],
        });

        expect(results.docs.map(({ id }) => id)).toEqual(["123", "234", "567", "456", "345"]);
      });
    });

    describe("cursors", () => {
      beforeEach(async () => {
        await loader.create([
          createUserPayload("123", { message: "msg1" }),
          createUserPayload("234", { message: "msg2" }),
          createUserPayload("345", { message: "msg1" }),
          createUserPayload("456", { message: "msg2" }),
          createUserPayload("567", { message: "msg1" }),
        ]);
      });

      it("applies startAfter", async () => {
        const results = await loader.executeQuery("users", {
          sort: { fieldPath: "name" },
          startAfter: ["Test User 234"],
        });

        expect(results.size).toBe(3);
        expect(results.docs[0].id).toEqual("345");
      });

      it("applies startAt", async () => {
        const results = await loader.executeQuery("users", {
          sort: { fieldPath: "name" },
          startAt: ["Test User 345"],
        });

        expect(results.size).toBe(3);
        expect(results.docs[0].id).toEqual("345");
      });

      it("applies endBefore", async () => {
        const results = await loader.executeQuery("users", {
          sort: { fieldPath: FIRESTORE_ID_FIELD },
          startAt: ["234"],
          endBefore: ["567"],
        });

        expect(results.size).toBe(3);
        expect(results.docs[2].id).toEqual("456");
      });

      it("applies endAt", async () => {
        const results = await loader.executeQuery("users", {
          sort: { fieldPath: FIRESTORE_ID_FIELD },
          startAfter: ["234"],
          endAt: ["567"],
        });

        expect(results.size).toBe(3);
        expect(results.docs[2].id).toEqual("567");
      });

      it("applies multiple properties", async () => {
        const results = await loader.executeQuery("users", {
          sort: [{ fieldPath: "message" }, { fieldPath: FIRESTORE_ID_FIELD }],
          startAfter: ["msg1", "345"],
          limit: 2,
        });

        expect(results.size).toBe(2);
        expect(results.docs[0].id).toEqual("567");
        expect(results.docs[1].id).toEqual("234");
      });

      it("applies cursor and limit", async () => {
        const results = await loader.executeQuery("users", {
          sort: { fieldPath: FIRESTORE_ID_FIELD },
          startAfter: ["234"],
          limit: 2,
        });

        expect(results.size).toBe(2);
        expect(results.docs[0].id).toEqual("345");
        expect(results.docs[1].id).toEqual("456");
      });
    });
  });

  describe("inTransaction", () => {
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    it("continues existing transaction for nested call", async () => {
      const runTransactionSpy = jest.spyOn(firestore, "runTransaction");
      await loader.create([
        createUserPayload("123", { message: "create" }),
        createUserPayload("234", { message: "create" }),
      ]);
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.set([createUserPayload("123", { message: "set" })]);
        await txnLoader.set([createUserPayload("234", { message: "set" })]);
        await txnLoader.inTransaction(async (nestedTxnLoader) => {
          await nestedTxnLoader.set([createUserPayload("234", { message: "setNested" })]);
        });
      });

      const fetched = await firestore.getAll(firestore.doc("/users/123"), firestore.doc("/users/234"));
      expect(fetched.length).toBe(2);
      expect(fetched[0].data()).toEqual({ name: `Test User 123`, message: "set" });
      expect(fetched[1].data()).toEqual({ name: `Test User 234`, message: "setNested" });
      expect(runTransactionSpy).toBeCalledTimes(1);
    });

    it("should handle transaction contention", async () => {
      await loader.create([createUserPayload("555", { message: "create" })]);
      const ref = firestore.doc("/users/555");

      // This txn will get write lock first and hold for 500ms before committing
      const txn1 = loader.inTransaction(async (txnLoader) => {
        const [doc555] = await txnLoader.get([ref]);
        await txnLoader.set([createUserPayload("555", { ...doc555, message: `${doc555?.message}-txn1` })]);
        await sleep(500);
      });

      // This txn should complete successfully but only after txn1 has completed
      await sleep(200);
      const txn2 = loader.inTransaction(async (txnLoader) => {
        const [doc555] = await txnLoader.get([ref]);
        await txnLoader.set([createUserPayload("555", { ...doc555, message: `${doc555?.message}-txn2` })]);
      });

      await Promise.all([txn1, txn2]);
      const fetchedDirect = await firestore.doc("/users/555").get();
      expect(fetchedDirect.data()).toEqual({ name: "Test User 555", message: "create-txn1-txn2" });
    }, 10000);
  });
});
