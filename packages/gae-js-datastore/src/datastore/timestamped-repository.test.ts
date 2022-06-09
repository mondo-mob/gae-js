import {
  DISABLE_TIMESTAMP_UPDATE,
  newTimestampedEntity,
  TimestampedEntity,
  TimestampedRepository,
} from "./timestamped-repository";
import { runWithRequestStorage, setRequestStorageValue } from "@mondomob/gae-js-core";
import { connectDatastoreEmulator, deleteKind } from "./test-utils";
import { Datastore } from "@google-cloud/datastore";
import { omit } from "lodash";

interface TimestampedItem extends TimestampedEntity {
  id: string;
  name: string;
}

describe("TimestampedRepository", () => {
  const collection = "timestamped-items";
  let datastore: Datastore;
  let repository: TimestampedRepository<TimestampedItem>;
  let startTime: Date;

  beforeAll(async () => (datastore = connectDatastoreEmulator()));
  beforeEach(async () => {
    await deleteKind(datastore, collection);
    repository = new TimestampedRepository<TimestampedItem>(collection, { datastore });
    jest.clearAllMocks();
    startTime = new Date();
  });

  const fixedTime = new Date("2022-03-01T12:13:14.000Z");

  const createItem = (id: string): TimestampedItem => ({
    ...newTimestampedEntity(id),
    name: `Test Item ${id}`,
  });

  const createItemFixedTime = (id: string): TimestampedItem => ({
    ...newTimestampedEntity(id),
    name: `Test Item ${id}`,
    createdAt: fixedTime,
    updatedAt: fixedTime,
  });

  const expectNewTimestamp = (actual: Date) => {
    expect(actual >= startTime).toBeTruthy();
  };

  describe("insert", () => {
    it("adds createdAt and updatedAt if not set on existing", async () => {
      await repository.insert({
        id: "123",
        name: "Test Item 123",
      } as TimestampedItem);

      const inserted = await repository.getRequired("123");

      expect(inserted.createdAt).toEqual(inserted.updatedAt);
      expectNewTimestamp(inserted.createdAt);
      expectNewTimestamp(inserted.updatedAt);
    });

    it("adds createdAt and updatedAt if generate flag set", async () => {
      const item = createItem("123");

      await repository.insert(item);
      const inserted = await repository.getRequired("123");

      expect(inserted.createdAt).toEqual(inserted.updatedAt);
      expectNewTimestamp(inserted.createdAt);
      expectNewTimestamp(inserted.updatedAt);
    });
  });

  describe("save", () => {
    it("adds createdAt if not set (i.e. to an existing record)", async () => {
      await datastore.insert({
        key: repository.key("123"),
        data: {
          name: `test${123}`,
        },
      });

      const fetched = await repository.getRequired("123");
      expect(fetched.createdAt).toBeFalsy();

      await repository.save(fetched);
      const updated = await repository.getRequired("123");
      expect(updated.createdAt).toEqual(updated.updatedAt);
      expectNewTimestamp(updated.createdAt);
      expectNewTimestamp(updated.updatedAt);
    });

    it("updates a single item", async () => {
      const item = createItemFixedTime("123");
      await datastore.insert({
        key: repository.key("123"),
        data: {
          ...omit(item, "id"),
        },
      });

      await repository.save(item);

      const updated = await repository.getRequired("123");
      expect(updated.createdAt).toEqual(fixedTime);
      expectNewTimestamp(updated.updatedAt);
    });

    it("updates array of items", async () => {
      const item1 = createItemFixedTime("123");
      const item2 = createItem("234");

      await repository.save([item1, item2]);

      const updated = await repository.getRequired(["123", "234"]);
      expect(updated[0].createdAt).toEqual(fixedTime);
      expectNewTimestamp(updated[1].createdAt);
      expectNewTimestamp(updated[0].updatedAt);
      expectNewTimestamp(updated[1].updatedAt);
    });

    it("skips update if flag set", async () => {
      const item = createItemFixedTime("123");

      await runWithRequestStorage(async () => {
        setRequestStorageValue(DISABLE_TIMESTAMP_UPDATE, true);
        return repository.save(item);
      });

      const updated = await repository.getRequired("123");
      expect(updated.createdAt).toEqual(fixedTime);
      expect(updated.updatedAt).toEqual(fixedTime);
    });
  });
});
