import { DatastoreEntity, DatastoreLoader, DatastorePayload } from "./datastore-loader";
import { connectDatastoreEmulator, deleteKinds } from "../__test/test-utils";
import { Datastore, Key } from "@google-cloud/datastore";

interface User {
  id: string;
  name: string;
  message?: string;
}

describe("DatastoreLoader", () => {
  let datastore: Datastore;
  let loader: DatastoreLoader;

  beforeAll(async () => {
    datastore = connectDatastoreEmulator();
  }, 30000);
  beforeEach(async () => {
    await deleteKinds(datastore, "users", "orgs", "groups", "ideas");
    loader = new DatastoreLoader(datastore);
    jest.clearAllMocks();
  });

  const userKey = (id: string): Key => datastore.key(["users", id]);
  const createUserPayload = (id: string, data?: Record<string, unknown>): DatastorePayload => {
    return {
      key: userKey(id),
      data: {
        name: `Test User ${id}`,
        ...data,
      },
    };
  };
  const datastoreEntity = (id: string, data?: Record<string, unknown>): DatastoreEntity => {
    return {
      [Datastore.KEY]: userKey(id),
      ...data,
    };
  };

  const fetchDirect = async (ids: string[]) => {
    const [fetched] = await datastore.get(ids.map(userKey));
    return fetched.map((f: any) => f);
  };
  const fetchLoader = async (ids: string[]) => {
    return loader.get(ids.map(userKey));
  };

  describe("get", () => {
    it("fetches from datastore on first request", async () => {
      const getSpy = jest.spyOn(datastore, "get");
      const key = userKey("123");
      await loader.get([key]);
      expect(getSpy).toBeCalledTimes(1);
    });

    it("should fetch data from cache", async () => {
      const getSpy = jest.spyOn(datastore, "get");
      const key = userKey("123");

      const doc1 = await loader.get([key]);
      const doc2 = await loader.get([key]);

      expect(doc1).toEqual(doc2);
      expect(getSpy).toBeCalledTimes(1);
    });
  });

  describe("insert", () => {
    it("creates documents outside of transaction", async () => {
      await loader.insert([createUserPayload("123"), createUserPayload("234")]);
      const fetched = await fetchDirect(["123", "234"]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual(datastoreEntity("123", { name: `Test User 123` }));
    });

    it("creates documents in transaction", async () => {
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.insert([createUserPayload("456"), createUserPayload("789")]);
      });

      const fetched = await fetchDirect(["456", "789"]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual(datastoreEntity("456", { name: `Test User 456` }));
    });

    it("rejects for document that already exists", async () => {
      await loader.insert([createUserPayload("123")]);
      await expect(loader.insert([createUserPayload("123")])).rejects.toThrow("ALREADY_EXISTS");
    });
  });

  describe("save", () => {
    it("should save documents outside of transaction", async () => {
      await loader.save([createUserPayload("123"), createUserPayload("234")]);
      const [fetched] = await datastore.get([userKey("123"), userKey("234")]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual(datastoreEntity("123", { name: `Test User 123` }));
    });

    it("should save documents in transaction", async () => {
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.save([createUserPayload("456"), createUserPayload("789")]);
      });

      const fetched = await fetchDirect(["456", "789"]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual(datastoreEntity("456", { name: `Test User 456` }));
    });

    it("overwrites document that already exists and updates cache", async () => {
      await loader.insert([createUserPayload("123", { message: "insert" })]);
      await loader.save([createUserPayload("123", { message: "save" })]);

      const fetchedDirect = await fetchDirect(["123"]);
      expect(fetchedDirect[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "save" }));

      const fetchedCache = await fetchLoader(["123"]);
      expect(fetchedCache[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "save" }));
    });

    it("clears stale cache value after transaction completes", async () => {
      await loader.insert([createUserPayload("123", { message: "insert" })]);
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.save([createUserPayload("123", { message: "save" })]);
      });

      const fetchedDirect = await fetchDirect(["123"]);
      expect(fetchedDirect[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "save" }));

      const fetchedLoader = await fetchLoader(["123"]);
      expect(fetchedLoader[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "save" }));
    });
  });

  describe("update", () => {
    it("should update documents outside of transaction", async () => {
      await loader.insert([
        createUserPayload("123", { message: "insert" }),
        createUserPayload("234", { message: "insert" }),
      ]);
      await loader.update([
        createUserPayload("123", { message: "update" }),
        createUserPayload("234", { message: "update" }),
      ]);

      const fetched = await fetchDirect(["123", "234"]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "update" }));
      expect(fetched[1]).toEqual(datastoreEntity("234", { name: `Test User 234`, message: "update" }));
    });

    it("should update documents in transaction", async () => {
      await loader.insert([
        createUserPayload("123", { message: "insert" }),
        createUserPayload("234", { message: "insert" }),
      ]);
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.update([
          createUserPayload("123", { message: "update" }),
          createUserPayload("234", { message: "update" }),
        ]);
      });

      const fetched = await fetchDirect(["123", "234"]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "update" }));
      expect(fetched[1]).toEqual(datastoreEntity("234", { name: `Test User 234`, message: "update" }));
    });

    it("rejects document that doesn't exist", async () => {
      await expect(loader.update([createUserPayload("123")])).rejects.toThrow("NOT_FOUND");
    });

    it("updates document and updates cache", async () => {
      await loader.insert([createUserPayload("123", { message: "insert" })]);
      await loader.update([createUserPayload("123", { message: "update" })]);

      const fetchedDirect = await fetchDirect(["123"]);
      expect(fetchedDirect[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "update" }));

      const fetchedCache = await fetchLoader(["123"]);
      expect(fetchedCache[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "update" }));
    });

    it("clears stale cache value after transaction completes", async () => {
      await loader.insert([createUserPayload("123", { message: "insert" })]);
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.update([createUserPayload("123", { message: "update" })]);
      });

      const fetchedDirect = await fetchDirect(["123"]);
      expect(fetchedDirect[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "update" }));

      const fetchedLoader = await fetchLoader(["123"]);
      expect(fetchedLoader[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "update" }));
    });
  });

  describe("upsert", () => {
    it("should update existing documents outside of transaction", async () => {
      await loader.insert([
        createUserPayload("123", { message: "insert" }),
        createUserPayload("234", { message: "insert" }),
      ]);
      await loader.upsert([
        createUserPayload("123", { message: "upsert" }),
        createUserPayload("234", { message: "upsert" }),
      ]);

      const fetched = await fetchDirect(["123", "234"]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "upsert" }));
      expect(fetched[1]).toEqual(datastoreEntity("234", { name: `Test User 234`, message: "upsert" }));
    });

    it("should update documents in transaction", async () => {
      await loader.insert([
        createUserPayload("123", { message: "insert" }),
        createUserPayload("234", { message: "insert" }),
      ]);
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.upsert([
          createUserPayload("123", { message: "upsert" }),
          createUserPayload("234", { message: "upsert" }),
        ]);
      });

      const fetched = await fetchDirect(["123", "234"]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "upsert" }));
      expect(fetched[1]).toEqual(datastoreEntity("234", { name: `Test User 234`, message: "upsert" }));
    });

    it("creates document that doesn't exist", async () => {
      await loader.upsert([createUserPayload("123", { message: "upsert" })]);

      const fetched = await fetchDirect(["123"]);
      expect(fetched[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "upsert" }));
    });

    it("updates document and updates cache", async () => {
      await loader.insert([createUserPayload("123", { message: "insert" })]);
      await loader.upsert([createUserPayload("123", { message: "upsert" })]);

      const fetchedDirect = await fetchDirect(["123"]);
      expect(fetchedDirect[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "upsert" }));

      const fetchedCache = await fetchLoader(["123"]);
      expect(fetchedCache[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "upsert" }));
    });

    it("clears stale cache value after transaction completes", async () => {
      await loader.insert([createUserPayload("123", { message: "insert" })]);
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.upsert([createUserPayload("123", { message: "upsert" })]);
      });

      const fetchedDirect = await fetchDirect(["123"]);
      expect(fetchedDirect[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "upsert" }));

      const fetchedLoader = await fetchLoader(["123"]);
      expect(fetchedLoader[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "upsert" }));
    });
  });

  describe("delete", () => {
    it("deletes a document outside of transaction", async () => {
      await loader.insert([createUserPayload("123")]);
      await loader.delete([userKey("123")]);

      const fetched = await fetchDirect(["123"]);
      expect(fetched.length).toBe(0);
    });

    it("deletes a document in transaction", async () => {
      await loader.insert([createUserPayload("123")]);
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.delete([userKey("123")]);
      });

      const fetched = await fetchDirect(["123"]);
      expect(fetched.length).toBe(0);
    });

    it("deletes document and removes from cache", async () => {
      await loader.insert([createUserPayload("123")]);
      await loader.delete([userKey("123")]);

      const fetchedCache = await fetchLoader(["123"]);
      expect(fetchedCache).toEqual([null]);
    });

    it("clears stale cache value after transaction completes", async () => {
      await loader.insert([createUserPayload("123")]);
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.delete([userKey("123")]);
      });

      const fetchedLoader = await fetchLoader(["123"]);
      expect(fetchedLoader).toEqual([null]);
    });
  });

  // TODO: GroupBy, HasAncestor
  describe("query", () => {
    it("selects specific fields", async () => {
      await loader.insert([
        createUserPayload("123", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }),
        createUserPayload("234", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }),
      ]);

      const [results] = await loader.executeQuery<{ prop1: string; prop2: string; prop3: string }>("users", {
        select: ["prop1", "prop3"],
      });

      expect(results.length).toBe(2);
      expect(results[0].prop1).toEqual("prop1");
      expect(results[0].prop2).toBeUndefined();
      expect(results[0].prop3).toEqual("prop3");
    });

    it("populates cache with results when all fields returned", async () => {
      const getSpy = jest.spyOn(datastore, "get");
      await datastore.insert({ key: userKey("123"), data: { prop1: "prop1" } });

      const [results] = await loader.executeQuery("users", {});
      const docs = await fetchLoader(["123"]);

      expect(results[0]).toEqual(datastoreEntity("123", { prop1: "prop1" }));
      expect(docs[0]).toEqual(datastoreEntity("123", { prop1: "prop1" }));
      expect(getSpy).toBeCalledTimes(0);
    });

    it("doesn't update cache with results when only some fields requested", async () => {
      const getSpy = jest.spyOn(datastore, "get");
      await datastore.insert({ key: userKey("123"), data: { prop1: "prop1", prop2: "prop2", prop3: "prop3" } });

      const [results] = await loader.executeQuery("users", {
        select: ["prop1", "prop3"],
      });
      const docs = await fetchLoader(["123"]);

      expect(results[0]).toEqual(datastoreEntity("123", { prop1: "prop1", prop3: "prop3" }));
      expect(docs[0]).toEqual(datastoreEntity("123", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }));
      expect(getSpy).toBeCalledTimes(1);
    });

    it("filters by exact match", async () => {
      await loader.insert([
        createUserPayload("123", { message: "user1" }),
        createUserPayload("234", { message: "user2" }),
      ]);

      const [results] = await loader.executeQuery("users", {
        filters: {
          message: {
            op: "=",
            value: "user1",
          },
        },
      });

      expect(results.length).toBe(1);
      expect(results[0].message).toEqual("user1");
    });

    it("support kindless queries", async () => {
      const parentKey = datastore.key(["orgs", "org1"]);
      await loader.insert([
        {
          key: datastore.key([...parentKey.path, "groups", "group1"]),
          data: { name: `Test Group 1` },
        },
        {
          key: datastore.key([...parentKey.path, "ideas", "idea1"]),
          data: { name: `Test Idea 1` },
        },
      ]);

      const [results] = await loader.executeQuery(null, {
        hasAncestor: parentKey,
      });

      expect(results.length).toBe(2);
      expect(results[0][Datastore.KEY].kind).toEqual("groups");
      expect(results[0].name).toEqual("Test Group 1");
      expect(results[1][Datastore.KEY].kind).toEqual("ideas");
      expect(results[1].name).toEqual("Test Idea 1");
    });

    describe("limit and offset", () => {
      beforeEach(async () => {
        await loader.insert([
          createUserPayload("123", { message: "user1" }),
          createUserPayload("234", { message: "user2" }),
          createUserPayload("345", { message: "user3" }),
          createUserPayload("456", { message: "user4" }),
          createUserPayload("567", { message: "user5" }),
        ]);
      });

      it("applies limit", async () => {
        const [results] = await loader.executeQuery("users", {
          limit: 3,
        });

        expect(results.length).toBe(3);
      });

      it("applies offset", async () => {
        const [results] = await loader.executeQuery<User>("users", {
          offset: 3,
        });

        expect(results.length).toBe(2);
        expect(results[0].message).toEqual("user4");
      });

      it("applies limit and offset", async () => {
        const [results] = await loader.executeQuery<User>("users", {
          limit: 2,
          offset: 2,
        });

        expect(results.length).toBe(2);
        expect(results[0].message).toEqual("user3");
        expect(results[1].message).toEqual("user4");
      });
    });

    describe("ordering", () => {
      beforeEach(async () => {
        await loader.insert([
          createUserPayload("123", { name: "123", cat1: "AA", cat2: "XX" }),
          createUserPayload("234", { name: "234", cat1: "BA", cat2: "XX" }),
          createUserPayload("345", { name: "345", cat1: "AB", cat2: "ZZ" }),
          createUserPayload("456", { name: "456", cat1: "BB", cat2: "YY" }),
          createUserPayload("567", { name: "567", cat1: "CA", cat2: "XX" }),
        ]);
      });

      it("orders results ascending", async () => {
        const [results] = await loader.executeQuery<{ name: string; cat1: string }>("users", {
          sort: {
            property: "cat1",
          },
        });

        expect(results.length).toBe(5);
        expect(results.map((doc) => doc.name)).toEqual(["123", "345", "234", "456", "567"]);
      });

      it("orders results descending", async () => {
        const [results] = await loader.executeQuery<{ name: string; cat1: string }>("users", {
          sort: {
            property: "cat1",
            options: { descending: true },
          },
        });

        expect(results.length).toBe(5);
        expect(results.map((doc) => doc.name)).toEqual(["567", "456", "234", "345", "123"]);
      });

      it("orders by multiple fields", async () => {
        const [results] = await loader.executeQuery<{ name: string; cat1: string; cat2: string }>("users", {
          sort: [
            {
              property: "cat2",
              options: { descending: false },
            },
            {
              property: "cat1",
              options: { descending: true },
            },
          ],
        });

        expect(results.length).toBe(5);
        expect(results.map((doc) => doc.name)).toEqual(["567", "234", "123", "456", "345"]);
      });

      it("orders results by id special key", async () => {
        const [results] = await loader.executeQuery<{ name: string; cat2: string }>("users", {
          sort: [{ property: "cat2" }, { property: "__key__" }],
        });

        expect(results.length).toBe(5);
        expect(results.map((doc) => doc.name)).toEqual(["123", "234", "567", "456", "345"]);
      });
    });

    describe("cursors", () => {
      beforeEach(async () => {
        await loader.insert([
          createUserPayload("123", { name: "123", message: "msg1" }),
          createUserPayload("234", { name: "234", message: "msg2" }),
          createUserPayload("345", { name: "345", message: "msg1" }),
          createUserPayload("456", { name: "456", message: "msg2" }),
          createUserPayload("567", { name: "567", message: "msg1" }),
        ]);
      });

      it("applies start cursor", async () => {
        const [, queryInfo] = await loader.executeQuery("users", {
          sort: { property: "name" },
          limit: 2,
        });

        const [results] = await loader.executeQuery<{ name: string }>("users", {
          sort: { property: "name" },
          start: queryInfo.endCursor,
        });

        expect(results.length).toBe(3);
        expect(results[0].name).toEqual("345");
      });

      it("applies end cursor", async () => {
        const [, queryInfo] = await loader.executeQuery("users", {
          sort: { property: "name" },
          limit: 3,
        });

        const [results] = await loader.executeQuery<{ name: string }>("users", {
          sort: { property: "name" },
          end: queryInfo.endCursor,
        });

        expect(results.length).toBe(3);
        expect(results[0].name).toEqual("123");
      });
    });
  });

  describe("inTransaction", () => {
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    it("continues existing transaction for nested call", async () => {
      const runTransactionSpy = jest.spyOn(datastore, "transaction");
      await loader.insert([
        createUserPayload("123", { message: "create" }),
        createUserPayload("234", { message: "create" }),
      ]);
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.update([createUserPayload("123", { message: "update" })]);
        await txnLoader.save([createUserPayload("234", { message: "save" })]);
        await txnLoader.inTransaction(async (nestedTxnLoader) => {
          await nestedTxnLoader.update([createUserPayload("234", { message: "updateNested" })]);
        });
      });

      const fetched = await fetchDirect(["123", "234"]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual(datastoreEntity("123", { name: `Test User 123`, message: "update" }));
      expect(fetched[1]).toEqual(datastoreEntity("234", { name: `Test User 234`, message: "updateNested" }));
      expect(runTransactionSpy).toBeCalledTimes(1);
    });

    it("should reject stale transaction", async () => {
      await loader.insert([createUserPayload("555", { message: "insert" })]);
      const key = userKey("555");

      // This txn should fail because it sleeps until after the next one completes
      const txn1 = loader.inTransaction(async (txnLoader) => {
        const docs = await txnLoader.get([key]);
        const document = { key, data: { ...docs[0]?.data, owner: "txn1" } };
        await txnLoader.save([document]);
        await sleep(500);
        return document;
      });

      // This txn should complete successfully
      const txn2 = loader.inTransaction(async (txnLoader) => {
        await sleep(100);
        const docs = await txnLoader.get([key]);
        const document = { key, data: { ...docs[0]?.data, owner: "txn2" } };
        await txnLoader.save([document]);
        return document;
      });

      await expect(txn1).rejects.toThrow("ABORTED: too much contention on these datastore entities. please try again.");

      const txn2Result = await txn2;
      expect(txn2Result.data).toEqual({ owner: "txn2" });

      const fetched = await fetchDirect(["555"]);
      expect(fetched[0]).toEqual(datastoreEntity("555", { owner: "txn2" }));
    });

    it("should reject transaction on commit failure", async () => {
      await loader.insert([
        createUserPayload("111", { message: "originalUser1" }),
        createUserPayload("222", { message: "originalUser2" }),
        ]
      );
      const key1 = userKey("111");


      // This txn should fail on commit because it is attempting to save a duplicate record (key1)
      const txn1 = loader.inTransaction(async (txnLoader) => {
        const document1 = createUserPayload("333", { message: "newUser3" });
        const document2 = { key:key1, data: { message: "newUser1" } };
        return txnLoader.insert([document1, document2]);
      });

      await expect(txn1).rejects.toThrow("ALREADY_EXISTS: entity already exists");
      const fetched = await fetchDirect(["111", "222", "333"])

      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual(datastoreEntity("111", { name: `Test User 111`, message: "originalUser1" }));
      expect(fetched[1]).toEqual(datastoreEntity("222", { name: `Test User 222`, message: "originalUser2" }));

    });

    it("should reject on callback failure", async () => {
      // This txn should fail on commit because it is attempting to save a duplicate record (key1)
      const txn1 = loader.inTransaction(async (txnLoader) => {
        const document1 = createUserPayload("111", { message: "newUser1" });
        await txnLoader.insert([document1]);
        // force callback error
        throw new Error("Test Callback Error");
      });

      await expect(txn1).rejects.toThrow("Test Callback Error");
      const fetched = await fetchDirect(["111"]);

      expect(fetched.length).toBe(0);
    });
  });
});
