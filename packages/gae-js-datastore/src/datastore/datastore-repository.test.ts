import { Datastore, Key } from "@google-cloud/datastore";
import { DatastoreRepository } from "./datastore-repository";
import { connectDatastoreEmulator, deleteKind } from "./test-utils";
import { runInTransaction } from "./transactional";
import { iots as t, runWithRequestStorage } from "@dotrun/gae-js-core";
import { datastoreLoaderRequestStorage } from "./datastore-request-storage";
import { DatastoreLoader } from "./datastore-loader";
import { datastoreProvider } from "./datastore-provider";

const repositoryItemSchema = t.type({
  id: t.string,
  name: t.string,
});

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
        const abc = ({ id: "123", message: "no name" } as any) as RepositoryItem;
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
        const abc = ({ id: "123", message: "no name" } as any) as RepositoryItem;
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
});
