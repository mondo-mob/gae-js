import { Filter } from "@google-cloud/firestore";
import { FIRESTORE_ID_FIELD } from "./firestore-constants";
import { FirestoreRepository } from "./firestore-repository";
import { useFirestoreTest } from "../__test/useFirestoreTest.hook";
import { FirestoreGroupRepository } from "./firestore-group-repository";
import { RepositoryItem } from "../__test/test-utils";

describe("FirestoreGroupRepository", () => {
  const collection = "repository-items";
  const subCollection = "sub-items";
  useFirestoreTest({ clearCollections: [collection] });

  let parentRepository: FirestoreRepository<RepositoryItem>;
  let subRepositoryA: FirestoreRepository<RepositoryItem>;
  let subRepositoryB: FirestoreRepository<RepositoryItem>;
  let groupRepository: FirestoreGroupRepository<RepositoryItem>;

  beforeEach(async () => {
    parentRepository = new FirestoreRepository<RepositoryItem>(collection);
    await parentRepository.save([createItem("A"), createItem("B")]);
    subRepositoryA = new FirestoreRepository<RepositoryItem>(`${collection}/A/${subCollection}`);
    subRepositoryB = new FirestoreRepository<RepositoryItem>(`${collection}/B/${subCollection}`);
    groupRepository = new FirestoreGroupRepository<RepositoryItem>(subCollection);
    jest.clearAllMocks();
  });

  const createItem = (id: string, data?: Record<string, unknown>) => {
    return {
      id,
      name: `Test Item ${id}`,
      ...data,
    };
  };

  describe("collection group queries", () => {
    describe("query", () => {
      describe("filters", () => {
        describe("filters specified by array", () => {
          it("filters by exact match", async () => {
            await subRepositoryA.insert([createItem("123")]);
            await subRepositoryB.insert([createItem("234")]);

            const results = await groupRepository.query({
              filters: [
                {
                  fieldPath: "name",
                  opStr: "==",
                  value: "Test Item 234",
                },
              ],
            });

            expect(results.length).toBe(1);
            expect(results[0].entity.name).toEqual("Test Item 234");
          });
        });

        describe("filters by class type", () => {
          it("filters by exact match", async () => {
            await subRepositoryA.insert([createItem("123")]);
            await subRepositoryB.insert([createItem("234")]);

            const results = await groupRepository.query({ filters: Filter.where("name", "==", "Test Item 234") });

            expect(results.length).toBe(1);
            expect(results[0].entity.name).toEqual("Test Item 234");
          });

          it("supports an OR query", async () => {
            await subRepositoryA.insert([createItem("123")]);
            await subRepositoryB.insert([createItem("234"), createItem("567")]);

            const results = await groupRepository.query({
              filters: Filter.or(Filter.where("id", "==", "123"), Filter.where("id", "==", "567")),
            });

            expect(results.length).toBe(2);
            expect(results[0].entity.name).toEqual("Test Item 123");
            expect(results[1].entity.name).toEqual("Test Item 567");
          });
        });
      });

      it("selects specific fields", async () => {
        await subRepositoryA.insert([createItem("123", { prop1: "prop1", prop2: "prop2", prop3: "prop3" })]);
        await subRepositoryB.insert([createItem("234", { prop1: "prop1", prop2: "prop2", prop3: "prop3" })]);

        const results = await groupRepository.query({
          select: ["prop1", "prop3"],
        });

        expect(results.length).toBe(2);
        expect(results[0].entity.prop1).toEqual("prop1");
        expect(results[0].entity.prop2).toBeUndefined();
        expect(results[0].entity.prop3).toEqual("prop3");
      });

      it("selects ids only when empty projection query", async () => {
        await subRepositoryA.insert([createItem("123", { prop1: "prop1", prop2: "prop2", prop3: "prop3" })]);
        await subRepositoryB.insert([createItem("234", { prop1: "prop1", prop2: "prop2", prop3: "prop3" })]);

        const results = await groupRepository.query({ select: [] });

        expect(results.map((r) => r.id)).toEqual([
          { id: "123", parentPath: "repository-items/A/sub-items" },
          { id: "234", parentPath: "repository-items/B/sub-items" },
        ]);
        expect(results.map((r) => r.entity)).toEqual([{ id: "123" }, { id: "234" }]);
      });

      it("selects ids only when FIRESTORE_ID_FIELD projection query", async () => {
        await subRepositoryA.insert([createItem("123", { prop1: "prop1", prop2: "prop2", prop3: "prop3" })]);
        await subRepositoryB.insert([createItem("234", { prop1: "prop1", prop2: "prop2", prop3: "prop3" })]);

        const results = await groupRepository.query({ select: [FIRESTORE_ID_FIELD] });

        expect(results.map((r) => r.id)).toEqual([
          { id: "123", parentPath: "repository-items/A/sub-items" },
          { id: "234", parentPath: "repository-items/B/sub-items" },
        ]);
        expect(results.map((r) => r.entity)).toEqual([{ id: "123" }, { id: "234" }]);
      });

      describe("limit and offset", () => {
        beforeEach(async () => {
          await subRepositoryA.insert([
            createItem("123", { prop1: "user1" }),
            createItem("234", { prop1: "user2" }),
            createItem("567", { prop1: "user5" }),
          ]);
          await subRepositoryB.insert([
            createItem("345", { prop1: "user3" }),
            createItem("456", { prop1: "user4" }),
            createItem("678", { prop1: "user6" }),
          ]);
        });

        it("applies limit", async () => {
          const results = await groupRepository.query({
            limit: 3,
          });

          expect(results.length).toBe(3);
        });

        it("applies offset", async () => {
          const results = await groupRepository.query({
            offset: 3,
          });

          expect(results.length).toBe(3);
          expect(results[0].id).toEqual({ id: "345", parentPath: "repository-items/B/sub-items" });
        });

        it("applies limit and offset", async () => {
          const results = await groupRepository.query({
            limit: 2,
            offset: 2,
          });

          expect(results.length).toBe(2);
          // Default ordering includes parent path
          expect(results[0].id).toEqual({ id: "567", parentPath: "repository-items/A/sub-items" });
          expect(results[1].id).toEqual({ id: "345", parentPath: "repository-items/B/sub-items" });
        });
      });

      describe("ordering", () => {
        beforeEach(async () => {
          await subRepositoryA.save([
            createItem("123", { prop1: "AA", prop2: "XX", nested: { prop3: 2 } }),
            createItem("234", { prop1: "BA", prop2: "XX", nested: { prop3: 1 } }),
            createItem("567", { prop1: "CA", prop2: "XX", nested: { prop3: 3 } }),
          ]);
          await subRepositoryB.save([
            createItem("345", { prop1: "AB", prop2: "ZZ", nested: { prop3: 4 } }),
            createItem("456", { prop1: "BB", prop2: "YY", nested: { prop3: 6 } }),
            createItem("678", { prop1: "CB", prop2: "YY", nested: { prop3: 5 } }),
          ]);
        });

        it("orders results ascending", async () => {
          const results = await groupRepository.query({
            sort: {
              fieldPath: "prop1",
              direction: "asc",
            },
          });

          expect(results.map(({ entity }) => entity.id)).toEqual(["123", "345", "234", "456", "567", "678"]);
        });

        it("orders results descending", async () => {
          const results = await groupRepository.query({
            sort: {
              fieldPath: "prop1",
              direction: "desc",
            },
          });

          expect(results.map(({ entity }) => entity.id)).toEqual(["678", "567", "456", "234", "345", "123"]);
        });

        it("orders results by nested field ascending", async () => {
          const results = await groupRepository.query({
            sort: {
              fieldPath: "nested.prop3",
              direction: "asc",
            },
          });

          expect(results.map(({ entity }) => entity.id)).toEqual(["234", "123", "567", "345", "678", "456"]);
        });

        it("orders results by nested field descending", async () => {
          const results = await groupRepository.query({
            sort: {
              fieldPath: "nested.prop3",
              direction: "desc",
            },
          });

          expect(results.map(({ entity }) => entity.id)).toEqual(["456", "678", "345", "567", "123", "234"]);
        });

        it("orders by multiple fields", async () => {
          const results = await groupRepository.query({
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

          expect(results.map(({ entity }) => entity.id)).toEqual(["567", "234", "123", "678", "456", "345"]);
        });

        it("orders results by id special key", async () => {
          const results = await groupRepository.query({
            sort: [{ fieldPath: "prop2" }, { fieldPath: FIRESTORE_ID_FIELD }],
          });

          expect(results.map(({ entity }) => entity.id)).toEqual(["123", "234", "567", "456", "678", "345"]);
        });
      });

      describe("cursors", () => {
        beforeEach(async () => {
          await subRepositoryA.save([
            createItem("123", { prop1: "msg1" }),
            createItem("234", { prop1: "msg2" }),
            createItem("567", { prop1: "msg1" }),
          ]);
          await subRepositoryB.save([
            createItem("345", { prop1: "msg1" }),
            createItem("456", { prop1: "msg2" }),
            createItem("678", { prop1: "msg1" }),
          ]);
        });

        it("applies startAfter", async () => {
          const results = await groupRepository.query({
            sort: { fieldPath: "name" },
            startAfter: ["Test Item 234"],
          });

          expect(results.length).toBe(4);
          expect(results[0].id).toEqual({ id: "345", parentPath: "repository-items/B/sub-items" });
        });

        it("applies startAt", async () => {
          const results = await groupRepository.query({
            sort: { fieldPath: "name" },
            startAt: ["Test Item 345"],
          });

          expect(results.length).toBe(4);
          expect(results[0].id).toEqual({ id: "345", parentPath: "repository-items/B/sub-items" });
        });

        it("applies endBefore", async () => {
          const results = await groupRepository.query({
            sort: { fieldPath: FIRESTORE_ID_FIELD },
            startAt: ["repository-items/A/sub-items/234"],
            endBefore: ["repository-items/B/sub-items/678"],
          });

          expect(results.length).toBe(4);
          expect(results[2].id).toEqual({ id: "345", parentPath: "repository-items/B/sub-items" });
        });

        it("applies endAt", async () => {
          const results = await groupRepository.query({
            sort: { fieldPath: FIRESTORE_ID_FIELD },
            startAfter: ["repository-items/A/sub-items/234"],
            endAt: ["repository-items/B/sub-items/678"],
          });

          expect(results.length).toBe(4);
          expect(results[2].id).toEqual({ id: "456", parentPath: "repository-items/B/sub-items" });
        });

        it("applies multiple properties", async () => {
          await groupRepository.query({
            filters: Filter.where("amount", ">=", 100),
          });
          const results = await groupRepository.query({
            sort: [{ fieldPath: "prop1" }, { fieldPath: FIRESTORE_ID_FIELD }],
            startAfter: ["msg1", "repository-items/B/sub-items/345"],
            limit: 2,
          });

          expect(results.length).toBe(2);
          expect(results[0].id).toEqual({ id: "678", parentPath: "repository-items/B/sub-items" });
          expect(results[1].id).toEqual({ id: "234", parentPath: "repository-items/A/sub-items" });
        });

        it("applies cursor and limit", async () => {
          const results = await groupRepository.query({
            sort: { fieldPath: FIRESTORE_ID_FIELD },
            startAfter: ["repository-items/A/sub-items/345"],
            limit: 2,
          });

          expect(results.length).toBe(2);
          expect(results[0].id).toEqual({ id: "567", parentPath: "repository-items/A/sub-items" });
          expect(results[1].id).toEqual({ id: "345", parentPath: "repository-items/B/sub-items" });
        });
      });
    });

    describe("queryForIds", () => {
      it("returns all matching id strings default sorted by full path when no filters applied", async () => {
        await subRepositoryB.insert([createItem("1"), createItem("2"), createItem("3")]);
        await subRepositoryA.insert([createItem("3"), createItem("11")]);

        const ids = await groupRepository.queryForIds();

        expect(ids).toEqual([
          { id: "11", parentPath: "repository-items/A/sub-items" },
          { id: "3", parentPath: "repository-items/A/sub-items" },
          { id: "1", parentPath: "repository-items/B/sub-items" },
          { id: "2", parentPath: "repository-items/B/sub-items" },
          { id: "3", parentPath: "repository-items/B/sub-items" },
        ]);
      });

      it("returns matching id strings matching filter and sorted by custom", async () => {
        await subRepositoryB.save([createItem("2", { name: "bbb" }), createItem("3", { name: "excluded" })]);
        await subRepositoryA.save([createItem("1", { name: "ccc" }), createItem("11", { name: "aaa" })]);

        const ids = await groupRepository.queryForIds({
          filters: [{ fieldPath: "name", opStr: "in", value: ["aaa", "bbb", "ccc"] }],
          sort: [{ fieldPath: "name" }],
        });

        expect(ids).toEqual([
          { id: "11", parentPath: "repository-items/A/sub-items" },
          { id: "2", parentPath: "repository-items/B/sub-items" },
          { id: "1", parentPath: "repository-items/A/sub-items" },
        ]);
      });
    });

    describe("count", () => {
      describe("empty collection", () => {
        it("returns 0 when collection is empty", async () => {
          expect(await groupRepository.count()).toBe(0);
        });
      });

      describe("with data", () => {
        beforeEach(async () => {
          await subRepositoryA.insert([
            createItem("1", { name: "aaa" }),
            createItem("3", { name: "aaa" }),
            createItem("5", { name: "zzz2" }),
          ]);
          await subRepositoryB.insert([createItem("2", { name: "aaa" }), createItem("4", { name: "zzz1" })]);
        });

        it("counts all items in a collection by default", async () => {
          expect(await groupRepository.count()).toBe(5);
        });

        it("counts all items matching filter", async () => {
          expect(
            await groupRepository.count({
              filters: [{ fieldPath: "name", opStr: "==", value: "aaa" }],
            })
          ).toBe(3);
        });
      });
    });
  });
});
