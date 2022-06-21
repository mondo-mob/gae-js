import { FirestoreLoader } from "./firestore-loader";
import { Firestore } from "@google-cloud/firestore";
import { connectFirestore, deleteCollection, RepositoryItem } from "../__test/test-utils";
import { execPostCommit, isTransactionActive, PostCommitError, runInTransaction, Transactional } from "./transactional";
import { FirestoreRepository } from "./firestore-repository";
import { runWithRequestStorage } from "@mondomob/gae-js-core";
import { firestoreLoaderRequestStorage } from "./firestore-request-storage";

class TransactionalService {
  constructor(
    public repository1: FirestoreRepository<RepositoryItem>,
    public repository2: FirestoreRepository<RepositoryItem>
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
  let firestore: Firestore;
  let repository1: FirestoreRepository<RepositoryItem>;
  let repository2: FirestoreRepository<RepositoryItem>;
  let service: TransactionalService;

  beforeAll(async () => (firestore = connectFirestore()));
  beforeEach(async () => {
    await deleteCollection(firestore.collection(collection1));
    await deleteCollection(firestore.collection(collection2));
    repository1 = new FirestoreRepository<RepositoryItem>(collection1, { firestore });
    repository2 = new FirestoreRepository<RepositoryItem>(collection2, { firestore });
    service = new TransactionalService(repository1, repository2);
    jest.clearAllMocks();
  });

  describe("Transactional Method Decorator", () => {
    it("does not run transaction for non-annotated method", async () => {
      const runTransactionSpy = jest.spyOn(firestore, "runTransaction");

      await runWithRequestStorage(async () => {
        firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));
        await service.saveItems("123");
      });

      await expect(repository1.get("123")).resolves.toBeTruthy();
      await expect(repository2.get("123")).resolves.toBeTruthy();
      expect(runTransactionSpy).toBeCalledTimes(0);
    });

    it("saves multiple collections in single transaction", async () => {
      const runTransactionSpy = jest.spyOn(firestore, "runTransaction");

      await runWithRequestStorage(async () => {
        firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));
        await service.saveItemsTransaction("123");
      });

      await expect(repository1.get("123")).resolves.toBeTruthy();
      await expect(repository2.get("123")).resolves.toBeTruthy();
      expect(runTransactionSpy).toBeCalledTimes(1);
    });

    it("continues existing transaction for nested decoration", async () => {
      const runTransactionSpy = jest.spyOn(firestore, "runTransaction");

      await runWithRequestStorage(async () => {
        firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));
        await service.saveItemsNestedTransaction("123");
      });

      await expect(repository1.get("123")).resolves.toBeTruthy();
      await expect(repository2.get("123")).resolves.toBeTruthy();
      expect(runTransactionSpy).toBeCalledTimes(1);
    });

    it("should abort when error thrown", async () => {
      await runWithRequestStorage(async () => {
        firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));

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
      const runTransactionSpy = jest.spyOn(firestore, "runTransaction");

      await runWithRequestStorage(async () => {
        firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));
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
        firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));
        return runInTransaction(() => {
          return service.saveItems("123");
        });
      });

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({ id: "123", name: "item123" });
    });

    it("continues existing transaction for nested decoration", async () => {
      const runTransactionSpy = jest.spyOn(firestore, "runTransaction");

      await runWithRequestStorage(async () => {
        firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));
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
        firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));

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

  describe("isTransactionActive", () => {
    it("returns true if transaction active", async () => {
      await runWithRequestStorage(async () => {
        firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));
        await runInTransaction(async () => expect(isTransactionActive()).toBe(true));
      });
    });

    it("returns true if transaction not active", async () => {
      await runWithRequestStorage(async () => {
        firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));
        expect(isTransactionActive()).toBe(false);
      });
    });
  });

  describe("execPostCommit", () => {
    it("executes action after commit, when in transaction", async () => {
      const executions: string[] = [];

      await testTransactionalSupport(() =>
        runInTransaction(async () => {
          await execPostCommit(() => executions.push("post-commit-1"));
          executions.push("action-1");
          await execPostCommit(() => executions.push("post-commit-2"));
          executions.push("action-2");
          executions.push("action-3");
        })
      );

      expect(executions).toEqual(["action-1", "action-2", "action-3", "post-commit-1", "post-commit-2"]);
    });

    it("does not execute post-commit actions when transaction does not commit", async () => {
      const executions: string[] = [];

      await expect(() =>
        testTransactionalSupport(() =>
          runInTransaction(async () => {
            await execPostCommit(() => executions.push("post-commit-1"));
            executions.push("action-1");
            await execPostCommit(() => executions.push("post-commit-2"));
            executions.push("action-2");
            throw new Error("Something went wrong");
          })
        )
      ).rejects.toThrow("Something went wrong");

      expect(executions).toEqual(["action-1", "action-2"]);
    });

    it("executes immediately when there is no open transaction", async () => {
      const executions: string[] = [];

      await testTransactionalSupport(async () => {
        await execPostCommit(() => executions.push("post-commit-1"));
        executions.push("action-1");
        await execPostCommit(() => executions.push("post-commit-2"));
        executions.push("action-2");
        executions.push("action-3");
      });

      expect(executions).toEqual(["post-commit-1", "action-1", "post-commit-2", "action-2", "action-3"]);
    });

    it("throws PostCommitError with result and cause when post commit action fails", async () => {
      const executions: string[] = [];
      const theCause = new Error("I am the cause");

      try {
        await testTransactionalSupport(() =>
          runInTransaction(async () => {
            await execPostCommit(() => executions.push("post-commit-0"));
            await execPostCommit(() => {
              throw theCause;
            });
            executions.push("action-1");
            await execPostCommit(() => executions.push("post-commit-2"));
            executions.push("action-2");
            executions.push("action-3");
            return "Result of the transactional block";
          })
        );
        fail("Expected error");
      } catch (err) {
        expect(err).toBeInstanceOf(PostCommitError);
        const postCommitError = err as PostCommitError;
        expect(postCommitError.cause).toBe(theCause);
        expect(postCommitError.result).toBe("Result of the transactional block");
      }

      expect(executions).toEqual(["action-1", "action-2", "action-3", "post-commit-0"]);
    });
  });

  const testTransactionalSupport = <T>(testFn: () => Promise<T>): Promise<T> =>
    runWithRequestStorage(async () => {
      firestoreLoaderRequestStorage.set(new FirestoreLoader(firestore));
      return testFn();
    });
});
