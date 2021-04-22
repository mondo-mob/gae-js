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
          createUserPayload("123", { category1: "AA", category2: "XX" }),
          createUserPayload("234", { category1: "BA", category2: "XX" }),
          createUserPayload("345", { category1: "AB", category2: "ZZ" }),
          createUserPayload("456", { category1: "BB", category2: "YY" }),
          createUserPayload("567", { category1: "CA", category2: "XX" }),
        ]);
      });

      it("orders results ascending", async () => {
        const results = await loader.executeQuery("users", {
          sort: {
            property: "category1",
            direction: "asc",
          },
        });

        expect(results.size).toBe(5);
        expect(results.docs.map((doc) => doc.id)).toEqual(["123", "345", "234", "456", "567"]);
      });

      it("orders results descending", async () => {
        const results = await loader.executeQuery("users", {
          sort: {
            property: "category1",
            direction: "desc",
          },
        });

        expect(results.size).toBe(5);
        expect(results.docs.map((doc) => doc.id)).toEqual(["567", "456", "234", "345", "123"]);
      });

      it("orders by multiple fields", async () => {
        const results = await loader.executeQuery("users", {
          sort: [
            {
              property: "category2",
              direction: "asc",
            },
            {
              property: "category1",
              direction: "desc",
            },
          ],
        });

        expect(results.size).toBe(5);
        expect(results.docs.map((doc) => doc.id)).toEqual(["567", "234", "123", "456", "345"]);
      });

      it("orders results by id special key", async () => {
        const results = await loader.executeQuery("users", {
          sort: [{ property: "category2" }, { property: "__name__" }],
        });

        expect(results.size).toBe(5);
        expect(results.docs.map((doc) => doc.id)).toEqual(["123", "234", "567", "456", "345"]);
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

      // it("applies limit", async () => {
      //   const results = await loader.executeQuery("users", {
      //     limit: 3,
      //   });
      //
      //   expect(results.size).toBe(3);
      // });

      it("applies startAfter", async () => {
        const results = await loader.executeQuery("users", {
          sort: { property: "name" },
          startAfter: ["Test User 234"],
        });

        expect(results.size).toBe(3);
        expect(results.docs[0].id).toEqual("345");
      });

      it("applies startAt", async () => {
        const results = await loader.executeQuery("users", {
          sort: { property: "name" },
          startAt: ["Test User 345"],
        });

        expect(results.size).toBe(3);
        expect(results.docs[0].id).toEqual("345");
      });

      it("applies endBefore", async () => {
        const results = await loader.executeQuery("users", {
          sort: { property: "__name__" },
          startAt: ["234"],
          endBefore: ["567"],
        });

        expect(results.size).toBe(3);
        expect(results.docs[2].id).toEqual("456");
      });

      it("applies endAt", async () => {
        const results = await loader.executeQuery("users", {
          sort: { property: "__name__" },
          startAfter: ["234"],
          endAt: ["567"],
        });

        expect(results.size).toBe(3);
        expect(results.docs[2].id).toEqual("567");
      });

      it("applies multiple properties", async () => {
        const results = await loader.executeQuery("users", {
          sort: [{ property: "message" }, { property: "__name__" }],
          startAfter: ["msg1", "345"],
          limit: 2,
        });

        expect(results.size).toBe(2);
        expect(results.docs[0].id).toEqual("567");
        expect(results.docs[1].id).toEqual("234");
      });

      it("applies cursor and limit", async () => {
        const results = await loader.executeQuery("users", {
          sort: { property: "__name__" },
          startAfter: ["234"],
          limit: 2,
        });

        expect(results.size).toBe(2);
        expect(results.docs[0].id).toEqual("345");
        expect(results.docs[1].id).toEqual("456");
      });
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
