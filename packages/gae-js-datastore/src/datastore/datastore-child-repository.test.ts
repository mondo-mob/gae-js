import { Datastore, Key } from "@google-cloud/datastore";
import { entity as Entity } from "@google-cloud/datastore/build/src/entity";
import { connectDatastoreEmulator, deleteKind } from "../__test/test-utils";
import { runInTransaction } from "./transactional";
import {
  IndexConfig,
  IndexEntry,
  iots as t,
  iotsValidator,
  Page,
  runWithRequestStorage,
  SearchFields,
  SearchService,
  Sort,
} from "@mondomob/gae-js-core";
import { datastoreLoaderRequestStorage } from "./datastore-request-storage";
import { DatastoreLoader } from "./datastore-loader";
import { datastoreProvider } from "./datastore-provider";
import { DatastoreChildRepository } from "./datastore-child-repository";

const datastoreKey = new t.Type<Entity.Key>(
  "Entity.Key",
  (input): input is Entity.Key => typeof input === "object",
  (input) => t.success(input as Entity.Key),
  (value: Entity.Key) => value
);

const repositoryItemSchema = t.intersection([
  t.type({
    parentKey: datastoreKey,
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
    propArray: t.array(t.string),
    propKey: datastoreKey,
  }),
]);
type RepositoryItem = t.TypeOf<typeof repositoryItemSchema>;
const kind = "repository-items";
const validator = iotsValidator(repositoryItemSchema);

describe("DatastoreChildRepository", () => {
  let datastore: Datastore;
  let repository: DatastoreChildRepository<RepositoryItem>;
  let parentKey: Key;

  beforeAll(async () => (datastore = connectDatastoreEmulator()));
  beforeEach(async () => {
    await deleteKind(datastore, kind);
    jest.clearAllMocks();
    repository = new DatastoreChildRepository<RepositoryItem>(kind, { datastore, parentProperty: "parentKey" });
    parentKey = datastore.key(["parent-items", "xyz"]);
  });

  const repoWithSchema = () =>
    new DatastoreChildRepository<RepositoryItem>(kind, { datastore, parentProperty: "parentKey", validator });

  const itemKey = (id: string): Key => datastore.key(parentKey.path.concat([kind, id]));

  const createItem = (id: string, data?: Record<string, unknown>) => {
    return { parentKey, id, name: `Test Item ${id}`, ...data };
  };

  const insertItemDirect = async (id: string) => {
    return datastore.insert({
      key: itemKey(id),
      data: { name: `test${id}` },
    });
  };

  describe("existsByKey", () => {
    it("returns true when a document exists", async () => {
      await insertItemDirect("123");
      expect(await repository.existsByKey(itemKey("123"))).toBe(true);
    });

    it("returns false when a document does not exist", async () => {
      expect(await repository.existsByKey(itemKey("does-not-exist-123"))).toBe(false);
    });
  });

  describe("exists", () => {
    it("returns true when a document exists", async () => {
      await insertItemDirect("123");
      expect(await repository.exists(parentKey, "123")).toBe(true);
    });

    it("returns false when a document does not exist", async () => {
      expect(await repository.exists(parentKey, "123")).toBe(false);
    });
  });

  describe("getByKey", () => {
    it("fetches document that exists", async () => {
      await insertItemDirect("123");

      const document = await repository.getByKey(itemKey("123"));

      expect(document).toEqual({ parentKey, id: "123", name: "test123" });
    });

    it("returns null for document that doesn't exist", async () => {
      const document = await repository.getByKey(itemKey("123"));

      expect(document).toBe(null);
    });

    describe("with schema", () => {
      beforeEach(() => {
        repository = repoWithSchema();
      });

      it("fetches document that exists and matches schema", async () => {
        await insertItemDirect("123");

        const document = await repository.getByKey(itemKey("123"));

        expect(document).toEqual({ parentKey, id: "123", name: "test123" });
      });

      it("throws for document that doesn't match schema", async () => {
        await datastore.insert({
          key: itemKey("123"),
          data: { description: "test123" },
        });

        await expect(repository.getByKey(itemKey("123"))).rejects.toThrow(
          '"repository-items" with id "parent-items|xyz|repository-items|123" failed to load'
        );
      });
    });

    describe("with datastore client in provider", () => {
      beforeEach(() => {
        datastoreProvider.set(datastore);
        repository = new DatastoreChildRepository<RepositoryItem>(kind, { parentProperty: "parentKey", validator });
      });

      it("fetches document that exists and matches schema", async () => {
        await insertItemDirect("123");

        const document = await repository.getByKey(itemKey("123"));

        expect(document).toEqual({ parentKey, id: "123", name: "test123" });
      });
    });
  });

  describe("get", () => {
    it("fetches document that exists", async () => {
      await insertItemDirect("123");

      const document = await repository.get(parentKey, "123");

      expect(document).toEqual({ parentKey, id: "123", name: "test123" });
    });

    it("returns null for document that doesn't exist", async () => {
      const document = await repository.get(parentKey, "123");

      expect(document).toBe(null);
    });

    describe("with schema", () => {
      beforeEach(() => {
        repository = repoWithSchema();
      });

      it("fetches document that exists and matches schema", async () => {
        await insertItemDirect("123");

        const document = await repository.get(parentKey, "123");

        expect(document).toEqual({ parentKey, id: "123", name: "test123" });
      });

      it("throws for document that doesn't match schema", async () => {
        await datastore.insert({
          key: itemKey("123"),
          data: { description: "test123" },
        });

        await expect(repository.get(parentKey, "123")).rejects.toThrow(
          '"repository-items" with id "parent-items|xyz|repository-items|123" failed to load'
        );
      });
    });

    describe("with datastore client in provider", () => {
      beforeEach(() => {
        datastoreProvider.set(datastore);
        repository = new DatastoreChildRepository<RepositoryItem>(kind, { parentProperty: "parentKey", validator });
      });

      it("fetches document that exists and matches schema", async () => {
        await insertItemDirect("123");

        const document = await repository.get(parentKey, "123");

        expect(document).toEqual({ parentKey, id: "123", name: "test123" });
      });
    });
  });

  describe("getRequiredByKey", () => {
    it("fetches document that exists", async () => {
      await insertItemDirect("123");

      const document = await repository.getRequiredByKey(itemKey("123"));

      expect(document).toEqual({ parentKey, id: "123", name: "test123" });
    });

    it("throws for document that doesn't exist", async () => {
      await expect(repository.getRequiredByKey(itemKey("123"))).rejects.toThrow("not found");
    });

    describe("with array", () => {
      it("fetches documents that exist", async () => {
        await insertItemDirect("123");
        await insertItemDirect("234");

        const results = await repository.getRequiredByKey([itemKey("123"), itemKey("234")]);

        expect(results).toEqual([
          { parentKey, id: "123", name: "test123" },
          { parentKey, id: "234", name: "test234" },
        ]);
      });

      it("throws for any document that doesn't exist", async () => {
        await insertItemDirect("123");

        await expect(
          repository.getRequiredByKey([itemKey("123"), itemKey("does-not-exist"), itemKey("also-does-not-exist")])
        ).rejects.toThrow(
          '"repository-items" with id "parent-items|xyz|repository-items|does-not-exist" failed to load'
        );
      });
    });

    describe("with schema", () => {
      beforeEach(() => {
        repository = repoWithSchema();
      });

      it("fetches document that exists and matches schema", async () => {
        await insertItemDirect("123");

        const document = await repository.getRequiredByKey(itemKey("123"));

        expect(document).toEqual({ parentKey, id: "123", name: "test123" });
      });

      it("throws for document that doesn't match schema", async () => {
        await datastore.insert({
          key: itemKey("123"),
          data: {
            description: "test123",
          },
        });
        await expect(repository.getRequiredByKey(itemKey("123"))).rejects.toThrow(
          '"repository-items" with id "parent-items|xyz|repository-items|123" failed to load'
        );
      });
    });
  });

  describe("getRequired", () => {
    it("fetches document that exists", async () => {
      await insertItemDirect("123");

      const document = await repository.getRequired(parentKey, "123");

      expect(document).toEqual({ parentKey, id: "123", name: "test123" });
    });

    it("throws for document that doesn't exist", async () => {
      await expect(repository.getRequired(parentKey, "123")).rejects.toThrow("not found");
    });

    describe("with schema", () => {
      beforeEach(() => {
        repository = repoWithSchema();
      });

      it("fetches document that exists and matches schema", async () => {
        await insertItemDirect("123");

        const document = await repository.getRequired(parentKey, "123");

        expect(document).toEqual({ parentKey, id: "123", name: "test123" });
      });

      it("throws for document that doesn't match schema", async () => {
        await datastore.insert({
          key: itemKey("123"),
          data: { description: "test123" },
        });

        await expect(repository.getRequired(parentKey, "123")).rejects.toThrow(
          '"repository-items" with id "parent-items|xyz|repository-items|123" failed to load'
        );
      });
    });

    describe("with datastore client in provider", () => {
      beforeEach(() => {
        datastoreProvider.set(datastore);
        repository = new DatastoreChildRepository<RepositoryItem>(kind, { parentProperty: "parentKey", validator });
      });

      it("fetches document that exists and matches schema", async () => {
        await insertItemDirect("123");

        const document = await repository.getRequired(parentKey, "123");

        expect(document).toEqual({ parentKey, id: "123", name: "test123" });
      });
    });
  });

  describe("save", () => {
    it("saves documents outside of transaction", async () => {
      await repository.save([createItem("123"), createItem("234")]);

      const fetched = await repository.getByKey([itemKey("123"), itemKey("234")]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual({ parentKey, id: "123", name: `Test Item 123` });
    });

    it("saves document with unindexed Key", async () => {
      await repository.save([createItem("123", { propKey: itemKey("234") })]);

      const fetched = await repository.getByKey(itemKey("123"));
      expect(fetched).toEqual({ parentKey, id: "123", name: `Test Item 123`, propKey: itemKey("234") });
    });

    it("saves documents in transaction", async () => {
      await runWithRequestStorage(async () => {
        datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));
        return runInTransaction(() => repository.save([createItem("123"), createItem("234")]));
      });

      const fetched = await repository.getByKey([itemKey("123"), itemKey("234")]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual({ parentKey, id: "123", name: `Test Item 123` });
    });

    it("overwrites document that already exists", async () => {
      await repository.save(createItem("123", { message: "create" }));
      await repository.save(createItem("123", { message: "save" }));

      const fetched = await repository.getByKey(itemKey("123"));
      expect(fetched).toEqual({ parentKey, id: "123", name: `Test Item 123`, message: "save" });
    });

    describe("with schema", () => {
      beforeEach(() => {
        repository = repoWithSchema();
      });

      it("saves document outside of transaction that matches schema", async () => {
        await repository.save([createItem("123"), createItem("234")]);

        const fetched = await repository.getByKey([itemKey("123"), itemKey("234")]);
        expect(fetched.length).toBe(2);
        expect(fetched[0]).toEqual({ parentKey, id: "123", name: `Test Item 123` });
      });

      it("saves document with unindexed Key", async () => {
        await repository.save([createItem("123", { propKey: itemKey("234") })]);

        const fetched = await repository.getByKey(itemKey("123"));
        expect(fetched).toEqual({ parentKey, id: "123", name: `Test Item 123`, propKey: itemKey("234") });
      });

      it("throws for document that doesn't match schema", async () => {
        const abc = { parentKey, id: "123", message: "no name" } as any as RepositoryItem;
        await expect(repository.save(abc)).rejects.toThrow(
          '"repository-items" with id "parent-items|xyz|repository-items|123" failed to save'
        );
      });
    });
  });

  describe("insert", () => {
    it("inserts documents outside of transaction", async () => {
      await repository.insert([createItem("123"), createItem("234")]);

      const fetched = await repository.getByKey([itemKey("123"), itemKey("234")]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual({ parentKey, id: "123", name: `Test Item 123` });
    });

    it("inserts documents in transaction", async () => {
      await runWithRequestStorage(async () => {
        datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));
        return runInTransaction(() => repository.insert([createItem("123"), createItem("234")]));
      });

      const fetched = await repository.getByKey([itemKey("123"), itemKey("234")]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual({ parentKey, id: "123", name: `Test Item 123` });
    });

    it("throws inserting document with id that already exists", async () => {
      await repository.insert(createItem("123", { message: "insert" }));
      await expect(repository.insert(createItem("123", { message: "insert again" }))).rejects.toThrow("ALREADY_EXISTS");
    });

    describe("with schema", () => {
      beforeEach(() => {
        repository = repoWithSchema();
      });

      it("inserts documents outside of transaction that match schema", async () => {
        await repository.insert([createItem("123"), createItem("234")]);

        const fetched = await repository.getByKey([itemKey("123"), itemKey("234")]);
        expect(fetched.length).toBe(2);
        expect(fetched[0]).toEqual({ parentKey, id: "123", name: `Test Item 123` });
      });

      it("throws for document that doesn't match schema", async () => {
        const abc = { parentKey, id: "123", message: "no name" } as any as RepositoryItem;
        await expect(repository.insert(abc)).rejects.toThrow(
          '"repository-items" with id "parent-items|xyz|repository-items|123" failed to save'
        );
      });
    });
  });

  describe("update", () => {
    it("updates documents outside of transaction", async () => {
      await repository.insert([createItem("123", { message: "create" }), createItem("234", { message: "create" })]);

      await repository.update([createItem("123", { message: "update" }), createItem("234", { message: "update" })]);

      const fetched = await repository.getByKey([itemKey("123"), itemKey("234")]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual({ parentKey, id: "123", name: `Test Item 123`, message: "update" });
    });

    it("updates documents in transaction", async () => {
      await repository.insert([createItem("123", { message: "create" }), createItem("234", { message: "create" })]);

      await runWithRequestStorage(async () => {
        datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));
        return runInTransaction(async () =>
          repository.update([createItem("123", { message: "update" }), createItem("234", { message: "update" })])
        );
      });

      const fetched = await repository.getByKey([itemKey("123"), itemKey("234")]);
      expect(fetched.length).toBe(2);
      expect(fetched[0]).toEqual({ parentKey, id: "123", name: `Test Item 123`, message: "update" });
    });

    describe("with schema", () => {
      beforeEach(async () => {
        repository = repoWithSchema();
        await repository.insert([createItem("123", { message: "create" }), createItem("234", { message: "create" })]);
      });

      it("updates document outside of transaction that matches schema", async () => {
        await repository.update([createItem("123", { message: "update" }), createItem("234", { message: "update" })]);

        const fetched = await repository.getByKey([itemKey("123"), itemKey("234")]);
        expect(fetched.length).toBe(2);
        expect(fetched[0]).toEqual({ parentKey, id: "123", name: `Test Item 123`, message: "update" });
      });

      it("throws for document that doesn't match schema", async () => {
        const abc = { parentKey, id: "123", message: "no name" } as any as RepositoryItem;
        await expect(repository.save(abc)).rejects.toThrow(
          '"repository-items" with id "parent-items|xyz|repository-items|123" failed to save'
        );
      });
    });
  });

  describe("deleteByKey", () => {
    it("deletes a document outside of transaction", async () => {
      await insertItemDirect("123");

      await repository.deleteByKey(itemKey("123"));

      const [doc] = await datastore.get(itemKey("123"));
      expect(doc).toBe(undefined);
    });

    it("deletes a document in transaction", async () => {
      await insertItemDirect("123");
      await insertItemDirect("234");

      await runWithRequestStorage(async () => {
        datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));
        return runInTransaction(() => repository.deleteByKey(itemKey("123"), itemKey("234")));
      });

      const [doc123] = await datastore.get(itemKey("123"));
      expect(doc123).toBe(undefined);
      const [doc234] = await datastore.get(itemKey("234"));
      expect(doc234).toBe(undefined);
    });
  });

  describe("delete", () => {
    it("deletes a document outside of transaction", async () => {
      await insertItemDirect("123");

      await repository.delete(parentKey, "123");

      const [doc] = await datastore.get(itemKey("123"));
      expect(doc).toBe(undefined);
    });

    it("deletes a document in transaction", async () => {
      await insertItemDirect("123");
      await insertItemDirect("234");

      await runWithRequestStorage(async () => {
        datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));
        return runInTransaction(() =>
          Promise.all([repository.delete(parentKey, "123"), repository.delete(parentKey, "234")])
        );
      });

      const [doc123] = await datastore.get(itemKey("123"));
      expect(doc123).toBe(undefined);
      const [doc234] = await datastore.get(itemKey("234"));
      expect(doc234).toBe(undefined);
    });
  });

  describe("query", () => {
    beforeEach(() => {
      repository = new DatastoreChildRepository<RepositoryItem>(kind, {
        parentProperty: "parentKey",
        datastore,
        validator,
        index: {
          name: true,
          prop1: true,
          prop2: true,
          prop3: true,
          propArray: true,
          propKey: true,
        },
      });
    });

    it("filters by exact match", async () => {
      await repository.save([createItem("123"), createItem("234")]);

      const [results] = await repository.query({
        filters: { name: "Test Item 234" },
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toEqual("Test Item 234");
    });

    it("filters by array match using short filter", async () => {
      await repository.save([
        createItem("123", { propArray: ["ROLE_1", "ROLE_2"] }),
        createItem("234", { propArray: ["ROLE_1", "ROLE_3"] }),
      ]);

      const [results] = await repository.query({
        filters: { propArray: "ROLE_3" },
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toEqual("Test Item 234");
    });

    it("filters by array match using complex filter", async () => {
      await repository.save([
        createItem("123", { propArray: ["ROLE_1", "ROLE_2"] }),
        createItem("234", { propArray: ["ROLE_1", "ROLE_3"] }),
      ]);

      const [results] = await repository.query({
        filters: { propArray: { op: "=", value: "ROLE_2" } },
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toEqual("Test Item 123");
    });

    it("filters by key", async () => {
      await repository.save([createItem("123", { propKey: itemKey("567") }), createItem("234")]);

      const [results] = await repository.query({
        filters: { propKey: itemKey("567") },
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toEqual("Test Item 123");
    });

    it("filters by key using complex filter", async () => {
      await repository.save([createItem("123", { propKey: itemKey("567") }), createItem("234")]);

      const [results] = await repository.query({
        filters: {
          propKey: {
            op: "=",
            value: itemKey("567"),
          },
        },
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toEqual("Test Item 123");
    });

    it("selects specific fields", async () => {
      await repository.save([
        createItem("123", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }),
        createItem("234", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }),
      ]);

      const [results] = await repository.query({
        select: ["prop1", "prop3"],
      });

      expect(results.length).toBe(2);
      expect(results[0].prop1).toEqual("prop1");
      expect(results[0].prop2).toBeUndefined();
      expect(results[0].prop3).toEqual("prop3");
    });

    it("selects everything when empty projection query", async () => {
      await repository.save([
        createItem("123", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }),
        createItem("234", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }),
      ]);
      const [results] = await repository.query({ select: [] });

      expect(results.length).toEqual(2);
      expect(results[0]).toEqual({
        parentKey,
        id: "123",
        name: "Test Item 123",
        prop1: "prop1",
        prop2: "prop2",
        prop3: "prop3",
      });
    });

    it("selects ids only when projection query", async () => {
      await repository.save([
        createItem("123", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }),
        createItem("234", { prop1: "prop1", prop2: "prop2", prop3: "prop3" }),
      ]);
      const [results] = await repository.query({ select: ["__key__"] });

      expect(results).toEqual([
        { parentKey, id: "123" },
        { parentKey, id: "234" },
      ]);
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
        const [results] = await repository.query({
          limit: 3,
        });

        expect(results.length).toBe(3);
      });

      it("applies offset", async () => {
        const [results] = await repository.query({
          offset: 3,
        });

        expect(results.length).toBe(2);
        expect(results[0].id).toEqual("456");
      });

      it("applies limit and offset", async () => {
        const [results] = await repository.query({
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
        const [results] = await repository.query({
          sort: {
            property: "prop1",
            options: {
              descending: false,
            },
          },
        });

        expect(results.length).toBe(5);
        expect(results.map((doc) => doc.id)).toEqual(["123", "345", "234", "456", "567"]);
      });

      it("orders results descending", async () => {
        const [results] = await repository.query({
          sort: {
            property: "prop1",
            options: {
              descending: true,
            },
          },
        });

        expect(results.length).toBe(5);
        expect(results.map((doc) => doc.id)).toEqual(["567", "456", "234", "345", "123"]);
      });

      it("orders by multiple fields", async () => {
        const [results] = await repository.query({
          sort: [
            {
              property: "prop2",
              options: {
                descending: false,
              },
            },
            {
              property: "prop1",
              options: {
                descending: true,
              },
            },
          ],
        });

        expect(results.length).toBe(5);
        expect(results.map((doc) => doc.id)).toEqual(["567", "234", "123", "456", "345"]);
      });

      it("orders results by id special key", async () => {
        const [results] = await repository.query({
          sort: [{ property: "prop2" }, { property: "__key__" }],
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

      it("applies start cursor", async () => {
        const [, queryInfo] = await repository.query({
          sort: { property: "name" },
          limit: 2,
        });

        const [results] = await repository.query({
          sort: { property: "name" },
          start: queryInfo.endCursor,
        });

        expect(results.length).toBe(3);
        expect(results[0].name).toEqual("Test Item 345");
      });

      it("applies end cursor", async () => {
        const [, queryInfo] = await repository.query({
          sort: { property: "name" },
          limit: 3,
        });

        const [results] = await repository.query({
          sort: { property: "name" },
          end: queryInfo.endCursor,
        });

        expect(results.length).toBe(3);
        expect(results[0].name).toEqual("Test Item 123");
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

    const initRepo = (indexConfig: IndexConfig<RepositoryItem>): DatastoreChildRepository<RepositoryItem> =>
      new DatastoreChildRepository<RepositoryItem>(kind, {
        datastore,
        parentProperty: "parentKey",
        validator,
        search: {
          searchService: searchService,
          indexName: "item",
          indexConfig,
        },
      });

    const createItem = (id: string): RepositoryItem => ({
      parentKey,
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
            id: "eyJwYXRoIjpbInBhcmVudC1pdGVtcyIsInh5eiIsInJlcG9zaXRvcnktaXRlbXMiLCJpdGVtMSJdfQ==",
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
            id: "eyJwYXRoIjpbInBhcmVudC1pdGVtcyIsInh5eiIsInJlcG9zaXRvcnktaXRlbXMiLCJpdGVtMSJdfQ==",
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
            id: "eyJwYXRoIjpbInBhcmVudC1pdGVtcyIsInh5eiIsInJlcG9zaXRvcnktaXRlbXMiLCJpdGVtMiJdfQ==",
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

    describe("update", () => {
      beforeEach(async () => {
        await insertItemDirect("item1");
        await insertItemDirect("item2");
      });
      itIndexesEntitiesForOperation("update");
    });

    describe("insert", () => {
      itIndexesEntitiesForOperation("insert");
    });

    describe("upsert", () => {
      itIndexesEntitiesForOperation("upsert");
    });

    describe("delete", () => {
      it("requests index deletion (single item)", async () => {
        await repository.deleteByKey(itemKey("item1"));

        expect(searchService.delete).toHaveBeenCalledWith(
          "item",
          "eyJwYXRoIjpbInBhcmVudC1pdGVtcyIsInh5eiIsInJlcG9zaXRvcnktaXRlbXMiLCJpdGVtMSJdfQ=="
        );
      });

      it("requests index deletion (multiple items)", async () => {
        await repository.deleteByKey(itemKey("item1"), itemKey("item2"));

        expect(searchService.delete).toHaveBeenCalledWith(
          "item",
          "eyJwYXRoIjpbInBhcmVudC1pdGVtcyIsInh5eiIsInJlcG9zaXRvcnktaXRlbXMiLCJpdGVtMSJdfQ==",
          "eyJwYXRoIjpbInBhcmVudC1pdGVtcyIsInh5eiIsInJlcG9zaXRvcnktaXRlbXMiLCJpdGVtMiJdfQ=="
        );
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
          ids: [
            "eyJwYXRoIjpbInBhcmVudC1pdGVtcyIsInh5eiIsInJlcG9zaXRvcnktaXRlbXMiLCJpdGVtMSJdfQ==",
            "eyJwYXRoIjpbInBhcmVudC1pdGVtcyIsInh5eiIsInJlcG9zaXRvcnktaXRlbXMiLCJpdGVtMiJdfQ==",
          ],
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
