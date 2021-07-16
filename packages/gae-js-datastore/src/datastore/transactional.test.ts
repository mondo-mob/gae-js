import { DatastoreLoader } from "./datastore-loader";
import { Datastore } from "@google-cloud/datastore";
import { connectDatastoreEmulator, deleteKind, RepositoryItem, repositoryItemSchema } from "./test-utils";
import { runInTransaction, Transactional } from "./transactional";
import { DatastoreRepository } from "./datastore-repository";
import { runWithRequestStorage } from "@dotrun/gae-js-core";
import { datastoreLoaderRequestStorage } from "./datastore-request-storage";

class TransactionalService {
  constructor(
    public repository1: DatastoreRepository<RepositoryItem>,
    public repository2: DatastoreRepository<RepositoryItem>
  ) {}

  async saveItems(id: string) {
    const item1 = await this.repository1.save({ id, name: `item${id}` });
    const item2 = await this.repository2.save({ id, name: `item${id}` });
    return [item1, item2];
  }

  @Transactional()
  async saveItemsTransaction(id: string) {
    return this.saveItems(id);
  }

  @Transactional()
  async saveItemsNestedTransaction(id: string) {
    return this.saveItemsTransaction(id);
  }

  @Transactional()
  async saveItemsThenThrow(id: string) {
    await this.saveItemsTransaction(id);
    throw new Error("failed");
  }
}

describe("Transactional", () => {
  const collection1 = "transactional1";
  const collection2 = "transactional2";
  let datastore: Datastore;
  let repository1: DatastoreRepository<RepositoryItem>;
  let repository2: DatastoreRepository<RepositoryItem>;
  let service: TransactionalService;

  beforeAll(async () => (datastore = connectDatastoreEmulator()));
  beforeEach(async () => {
    await deleteKind(datastore, collection1);
    await deleteKind(datastore, collection2);
    repository1 = new DatastoreRepository<RepositoryItem>(collection1, { datastore, validator: repositoryItemSchema });
    repository2 = new DatastoreRepository<RepositoryItem>(collection2, { datastore, validator: repositoryItemSchema });
    service = new TransactionalService(repository1, repository2);
    jest.clearAllMocks();
  });

  describe("Transactional Method Decorator", () => {
    it("does not run transaction for non-annotated method", async () => {
      const runTransactionSpy = jest.spyOn(datastore, "transaction");

      await runWithRequestStorage(async () => {
        datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));
        await service.saveItems("123");
      });

      await expect(repository1.get("123")).resolves.toBeTruthy();
      await expect(repository2.get("123")).resolves.toBeTruthy();
      expect(runTransactionSpy).toBeCalledTimes(0);
    });

    it("saves multiple collections in single transaction", async () => {
      const runTransactionSpy = jest.spyOn(datastore, "transaction");

      await runWithRequestStorage(async () => {
        datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));
        await service.saveItemsTransaction("123");
      });

      await expect(repository1.get("123")).resolves.toBeTruthy();
      await expect(repository2.get("123")).resolves.toBeTruthy();
      expect(runTransactionSpy).toBeCalledTimes(1);
    });

    it("continues existing transaction for nested decoration", async () => {
      const runTransactionSpy = jest.spyOn(datastore, "transaction");

      await runWithRequestStorage(async () => {
        datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));
        await service.saveItemsNestedTransaction("123");
      });

      await expect(repository1.get("123")).resolves.toBeTruthy();
      await expect(repository2.get("123")).resolves.toBeTruthy();
      expect(runTransactionSpy).toBeCalledTimes(1);
    });

    it("should abort when error thrown", async () => {
      await runWithRequestStorage(async () => {
        datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));

        try {
          await service.saveItemsTransaction("123");
          await service.saveItemsThenThrow("456");
          fail("Should have thrown by now");
        } catch {
          await expect(repository1.get("123")).resolves.toBeTruthy();
          await expect(repository2.get("123")).resolves.toBeTruthy();
          await expect(repository1.get("456")).resolves.toBe(null);
          await expect(repository2.get("456")).resolves.toBe(null);
        }
      });
    });
  });

  describe("runInTransaction", () => {
    it("saves multiple collections in single transaction", async () => {
      const runTransactionSpy = jest.spyOn(datastore, "transaction");

      await runWithRequestStorage(async () => {
        datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));
        await runInTransaction(async () => {
          await service.saveItems("123");
        });
      });

      await expect(repository1.get("123")).resolves.toBeTruthy();
      await expect(repository2.get("123")).resolves.toBeTruthy();
      expect(runTransactionSpy).toBeCalledTimes(1);
    });

    it("returns result", async () => {
      const result = await runWithRequestStorage(async () => {
        datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));
        return runInTransaction(() => {
          return service.saveItems("123");
        });
      });

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({ id: "123", name: "item123" });
    });

    it("continues existing transaction for nested decoration", async () => {
      const runTransactionSpy = jest.spyOn(datastore, "transaction");

      await runWithRequestStorage(async () => {
        datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));
        await runInTransaction(async () => {
          await runInTransaction(async () => {
            await service.saveItems("123");
          });
        });
      });

      await expect(repository1.get("123")).resolves.toBeTruthy();
      await expect(repository2.get("123")).resolves.toBeTruthy();
      expect(runTransactionSpy).toBeCalledTimes(1);
    });

    it("should abort when error thrown", async () => {
      await runWithRequestStorage(async () => {
        datastoreLoaderRequestStorage.set(new DatastoreLoader(datastore));

        try {
          await runInTransaction(async () => service.saveItems("234"));
          await runInTransaction(async () => {
            await service.saveItems("567");
            throw new Error("failed");
          });
          fail("Should have thrown by now");
        } catch {
          await expect(repository1.get("234")).resolves.toBeTruthy();
          await expect(repository2.get("234")).resolves.toBeTruthy();
          await expect(repository1.get("567")).resolves.toBe(null);
          await expect(repository2.get("567")).resolves.toBe(null);
        }
      });
    });
  });
});
