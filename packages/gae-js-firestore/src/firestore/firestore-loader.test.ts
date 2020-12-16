import { FirestoreLoader } from "./firestore-loader";
import { Firestore } from "@google-cloud/firestore";
import { connectFirestore, deleteCollection } from "./test-utils";

// For transaction tests when emulator supports it
// const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

describe("FirestoreLoader", () => {
  let firestore: Firestore;
  let loader: FirestoreLoader;

  beforeAll(async () => (firestore = connectFirestore()));
  beforeEach(async () => {
    await deleteCollection(firestore.collection("users"));
    loader = new FirestoreLoader(firestore);
    jest.clearAllMocks();
  });

  const createUserPayload = (id: string, data?: Record<string, unknown>) => {
    return {
      ref: firestore.doc(`/users/${id}`),
      data: {
        name: `Test User ${id}`,
        ...data,
      },
    };
  };

  describe("get", () => {
    it("fetches from firestore on first request", async () => {
      const getAllSpy = jest.spyOn(firestore, "getAll");
      const ref = firestore.doc("/users/123");
      await loader.get([ref]);
      expect(getAllSpy).toBeCalledTimes(1);
    });

    it("should fetch data from cache", async () => {
      const getAllSpy = jest.spyOn(firestore, "getAll");
      const ref = firestore.doc("/users/123");

      const doc1 = await loader.get([ref]);
      const doc2 = await loader.get([ref]);

      expect(doc1).toEqual(doc2);
      expect(getAllSpy).toBeCalledTimes(1);
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

    it("overwrites document that already exists", async () => {
      await loader.create([createUserPayload("123", { message: "create" })]);
      await loader.set([createUserPayload("123", { message: "set" })]);
      const fetched = await firestore.doc("/users/123").get();
      expect(fetched.data()).toEqual({ name: `Test User 123`, message: "set" });
    });
  });

  describe("update", () => {
    it("should update documents outside of transaction", async () => {
      await loader.create([
        createUserPayload("123", { message: "create" }),
        createUserPayload("234", { message: "create" }),
      ]);
      await loader.update([
        createUserPayload("123", { message: "update" }),
        createUserPayload("234", { message: "update" }),
      ]);
      const fetched = await firestore.getAll(firestore.doc("/users/123"), firestore.doc("/users/234"));
      expect(fetched.length).toBe(2);
      expect(fetched[0].data()).toEqual({ name: `Test User 123`, message: "update" });
      expect(fetched[1].data()).toEqual({ name: `Test User 234`, message: "update" });
    });

    it("should set documents in transaction", async () => {
      await loader.create([
        createUserPayload("123", { message: "create" }),
        createUserPayload("234", { message: "create" }),
      ]);
      await loader.inTransaction(async (txnLoader) => {
        await txnLoader.update([
          createUserPayload("123", { message: "update" }),
          createUserPayload("234", { message: "update" }),
        ]);
      });

      const fetched = await firestore.getAll(firestore.doc("/users/123"), firestore.doc("/users/234"));
      expect(fetched.length).toBe(2);
      expect(fetched[0].data()).toEqual({ name: `Test User 123`, message: "update" });
      expect(fetched[1].data()).toEqual({ name: `Test User 234`, message: "update" });
    });

    it("rejects document that doesn't exist", async () => {
      await expect(loader.update([createUserPayload("123")])).rejects.toThrow("NOT_FOUND");
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
  });

  describe("query", () => {
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
  });

  // Firestore Emulator does not have deadlock handling so we can't test for it
  // describe("inTransaction", () => {
  //   it("should run transaction", async () => {
  //     const ref = firestore.doc("/users/123");
  //
  //     // const txn1 = firestore
  //     //   .runTransaction(async (txn) => {
  //     //     console.log("start txn1");
  //     //     const doc = await txn.get(ref);
  //     //     console.log("fetched txn1 doc");
  //     //     await txn.set(ref, { ...doc.data(), owner: "txn1" });
  //     //     console.log("set txn1");
  //     //     await sleep(1000);
  //     //   })
  //     //   .then(() => {
  //     //     console.log("end txn1");
  //     //   })
  //     //   .catch((e) => {
  //     //     console.log("error txn1", e);
  //     //   });
  //
  //     // const txn2 = firestore
  //     //   .runTransaction(async (txn) => {
  //     //     await sleep(500);
  //     //     console.log("start txn2");
  //     //     const doc = await txn.get(ref);
  //     //     console.log("fetched txn2 doc");
  //     //     await txn.set(ref, { ...doc.data(), owner: "txn2" });
  //     //     console.log("set txn2");
  //     //   })
  //     //   .then(() => {
  //     //     console.log("end txn2");
  //     //   })
  //     //   .catch((e) => {
  //     //     console.log("error txn2", e);
  //     //   });
  //
  //     const txn1 = loader
  //       .inTransaction(async (txnLoader) => {
  //         console.log("start txn1");
  //         const docs = await txnLoader.get([ref]);
  //         console.log("fetched txn1", docs);
  //         await txnLoader.set([{ ref, data: { ...docs[0], owner: "txn1" } }]);
  //         console.log("set txn1");
  //         await sleep(1000);
  //       })
  //       .then(() => {
  //         console.log("end txn1");
  //       })
  //       .catch((e) => {
  //         console.log("error txn1", e);
  //       });
  //
  //     const txn2 = loader
  //       .inTransaction(async (txnLoader) => {
  //         await sleep(500);
  //         console.log("start txn2");
  //         const doc = await txnLoader.get([ref]);
  //         console.log("fetched txn2 doc");
  //         await txnLoader.set([{ ref, data: { ...doc, owner: "txn2" } }]);
  //         console.log("set txn2");
  //       })
  //       .then(() => {
  //         console.log("end txn2");
  //       })
  //       .catch((e) => {
  //         console.log("error txn2", e);
  //       });
  //     await Promise.all([txn1, txn2]);
  //     // await Promise.all([txn2]);
  //     // const txn1Result = await txn1;
  //     // console.log("result1", ftxn1Result);
  //     // console.log("result2", ftxn2Result);
  //     // console.log("result1", txn1Result);
  //     // console.log("result2", txn2Result);
  //   });
  // });
  // afterAll(() => Promise.all(testing.apps().map((app) => app.delete())));
});
