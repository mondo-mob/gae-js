import { Firestore } from "@google-cloud/firestore";
import { connectFirestore, deleteCollection } from "./test-utils";
import {
  DISABLE_TIMESTAMP_UPDATE,
  newTimestampedEntity,
  TimestampedEntity,
  TimestampedRepository,
} from "./timestamped-repository";
import { runWithRequestStorage, setRequestStorageValue } from "@mondomob/gae-js-core";

interface TimestampedItem extends TimestampedEntity {
  id: string;
  name: string;
}

describe("TimestampedRepository", () => {
  const collection = "timestamped-items";
  let firestore: Firestore;
  let repository: TimestampedRepository<TimestampedItem>;

  beforeAll(async () => (firestore = connectFirestore()));
  beforeEach(async () => {
    await deleteCollection(firestore.collection(collection));
    repository = new TimestampedRepository<TimestampedItem>(collection, { firestore });
    jest.clearAllMocks();
  });

  const fixedTime = "2022-03-01T12:13:14.000Z";

  const createItem = (id: string): TimestampedItem => {
    return {
      ...newTimestampedEntity(id),
      name: `Test Item ${id}`,
      createdAt: fixedTime,
      updatedAt: fixedTime,
    };
  };

  describe("insert", () => {
    it("adds createdAt and updatedAt if not set", async () => {
      const item = {
        id: "123",
        name: "Test Item 123",
      } as TimestampedItem;
      await repository.insert(item);

      const inserted = await repository.getRequired("123");

      expect(inserted.createdAt).toBeTruthy();
      expect(inserted.updatedAt).toBeTruthy();
    });
  });

  describe("save", () => {
    it("adds createdAt if not set (i.e. to an existing record)", async () => {
      await firestore.doc(`${collection}/123`).create({
        id: "123",
        name: "Test Item 123",
      });

      const fetched = await repository.getRequired("123");
      expect(fetched.createdAt).toBeFalsy();

      await repository.save(fetched);
      const updated = await repository.getRequired("123");
      expect(updated.createdAt).toBeTruthy();
      expect(updated.updatedAt).toBeTruthy();
    });

    it("updates a single item", async () => {
      const item = createItem("123");

      await repository.save(item);

      const updated = await repository.getRequired("123");
      expect(updated.createdAt).toEqual(fixedTime);
      expect(new Date(updated.updatedAt) > new Date(fixedTime)).toBeTruthy();
    });

    it("updates array of items", async () => {
      const item1 = createItem("123");
      const item2 = createItem("234");

      await repository.save([item1, item2]);

      const updated = await repository.get(["123", "234"]);
      expect(updated[0].createdAt).toEqual(fixedTime);
      expect(updated[1].createdAt).toEqual(fixedTime);
      expect(new Date(updated[0].updatedAt) > new Date(fixedTime)).toBeTruthy();
      expect(new Date(updated[1].updatedAt) > new Date(fixedTime)).toBeTruthy();
    });

    it("skips update if flag set", async () => {
      const item = createItem("123");

      await runWithRequestStorage(async () => {
        setRequestStorageValue(DISABLE_TIMESTAMP_UPDATE, true);
        return repository.save(item);
      });

      const updated = await repository.getRequired("123");
      expect(updated.createdAt).toEqual(fixedTime);
      expect(updated.updatedAt).toEqual(fixedTime);
    });
  });

  describe("update", () => {
    it("adds createdAt if not set (i.e. to an existing record)", async () => {
      await firestore.doc(`${collection}/123`).create({
        id: "123",
        name: "Test Item 123",
      });

      const fetched = await repository.getRequired("123");
      expect(fetched.createdAt).toBeFalsy();

      await repository.update(fetched);
      const updated = await repository.getRequired("123");
      expect(updated.createdAt).toBeTruthy();
      expect(updated.updatedAt).toBeTruthy();
    });

    it("updates single item", async () => {
      const item = createItem("123");
      await firestore.doc(`${collection}/123`).create(item);

      await repository.update(item);

      const updated = await repository.getRequired("123");
      expect(updated.createdAt).toEqual(fixedTime);
      expect(new Date(updated.updatedAt) > new Date(fixedTime)).toBeTruthy();
    });

    it("updates array of items", async () => {
      const item1 = createItem("123");
      const item2 = createItem("234");
      await firestore.doc(`${collection}/123`).create(item1);
      await firestore.doc(`${collection}/234`).create(item2);

      await repository.update([item1, item2]);

      const updated = await repository.get(["123", "234"]);
      expect(updated[0].createdAt).toEqual(fixedTime);
      expect(updated[1].createdAt).toEqual(fixedTime);
      expect(new Date(updated[0].updatedAt) > new Date(fixedTime)).toBeTruthy();
      expect(new Date(updated[1].updatedAt) > new Date(fixedTime)).toBeTruthy();
    });

    it("skips update if flag set", async () => {
      const item = createItem("123");
      await firestore.doc(`${collection}/123`).create(item);

      await runWithRequestStorage(async () => {
        setRequestStorageValue(DISABLE_TIMESTAMP_UPDATE, true);
        return repository.update(item);
      });

      const updated = await repository.getRequired("123");
      expect(updated.createdAt).toEqual(fixedTime);
      expect(updated.updatedAt).toEqual(fixedTime);
    });
  });
});
