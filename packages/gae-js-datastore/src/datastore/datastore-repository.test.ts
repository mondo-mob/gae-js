import { Datastore, Key } from "@google-cloud/datastore";
import { DatastoreRepository } from "./datastore-repository";
import { connectDatastoreEmulator, deleteKind } from "./test-utils";
import { runInTransaction } from "./transactional";
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
import { datastoreLoaderRequestStorage } from "./datastore-request-storage";
import { DatastoreLoader } from "./datastore-loader";
import { datastoreProvider } from "./datastore-provider";

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

// TODO: beforePersist hook
// TODO: update
// TODO: upsert

describe("DatastoreRepository", () => {
  const collection = "repository-items";
  let datastore: Datastore;
  let repository: DatastoreRepository<RepositoryItem>;

  beforeAll(async () => (datastore = connectDatastoreEmulator()));
  beforeEach(async () => {
    await deleteKind(datastore, collection);
    repository = new DatastoreRepository<RepositoryItem>(collection, { datastore, validator: repositoryItemSchema });
    jest.clearAllMocks();
  });

  const itemKey = (id: string): Key => datastore.key([collection, id]);

  const createItem = (id: string, data?: Record<string, unknown>) => {
    return {
      id,
      name: `Test Item ${id}`,
      ...data,
    };
  };

  const insertItem = async (id: string) => {
    return datastore.insert({
      key: itemKey(id),
      data: {
        name: `test${id}`,
      },
    });
  };

  describe("exists", () => {
    it("returns true when a document exists", async () => {
      await insertItem("123");
      expect(await repository.exists("123")).toBe(true);
    });

    it("returns false when a document does not exist", async () => {
      expect(await repository.exists("does-not-exist-123")).toBe(false);
    });
  });

  describe("get", () => {
    it("fetches document that exists", async () => {
      await insertItem("123");

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
      it("fetches document that exists and matches schema", async () => {
        await insertItem("123");

        const document = await repository.get("123");

        expect(document).toEqual({
          id: "123",
          name: "test123",
        });
      });

      it("throws for document that doesn't match schema", async () => {
        await datastore.insert({
          key: itemKey("123"),
          data: {
            description: "test123",
          },
        });
        await expect(repository.get("123")).rejects.toThrow('"repository-items" with id "123" failed to load');
      });
    });

    describe("with datastore client in provider", () => {
      beforeEach(() => {
        datastoreProvider.set(datastore);
        repository = new DatastoreRepository<RepositoryItem>(collection, { validator: repositoryItemSchema });
      });

      it("fetches document that exists and matches schema", async () => {
        await insertItem("123");

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
      await datastore.insert({
        key: itemKey("123"),
        data: {
          name: "test123",
        },
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
      it("fetches document that exists and matches schema", async () => {
        await insertItem("123");

        const document = await repository.getRequired("123");

        expect(document).toEqual({
          id: "123",
          name: "test123",
        });
      });

      it("throws for document that doesn't match schema", async () => {
        await datastore.insert({
          key: itemKey("123"),
          data: {
            description: "test123",
          },
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
        datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));
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
        datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));
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
      await insertItem("123");

      await repository.delete("123");

      const [doc] = await datastore.get(itemKey("123"));
      expect(doc).toBe(undefined);
    });

    it("deletes a document in transaction", async () => {
      await insertItem("123");
      await insertItem("234");

      await runWithRequestStorage(async () => {
        datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));
        return runInTransaction(() => repository.delete("123", "234"));
      });

      const [doc123] = await datastore.get(itemKey("123"));
      expect(doc123).toBe(undefined);
      const [doc234] = await datastore.get(itemKey("234"));
      expect(doc234).toBe(undefined);
    });
  });

  describe("query", () => {
    beforeEach(() => {
      repository = new DatastoreRepository<RepositoryItem>(collection, {
        datastore,
        validator: repositoryItemSchema,
        index: {
          name: true,
        },
      });
    });
    // TODO: selects specific fields
    // TODO: limit and offset
    // TODO: ordering
    it("filters by exact match", async () => {
      await repository.save([createItem("123"), createItem("234")]);

      const [results] = await repository.query({
        filters: {
          name: "Test Item 234",
        },
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toEqual("Test Item 234");
    });
  });

  describe("with search enabled", () => {
    const searchService: SearchService = {
      index: jest.fn(),
      delete: jest.fn(),
      deleteAll: jest.fn(),
      query: jest.fn(),
    };

    const initRepo = (indexConfig: IndexConfig<RepositoryItem>): DatastoreRepository<RepositoryItem> =>
      new DatastoreRepository<RepositoryItem>(collection, {
        datastore,
        validator: repositoryItemSchema,
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

    describe("update", () => {
      beforeEach(async () => {
        await insertItem("item1");
        await insertItem("item2");
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
