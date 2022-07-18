import { Datastore } from "@google-cloud/datastore";
import { DatastoreRepository, StringIdEntity } from "./datastore-repository";
import { connectDatastoreEmulator, deleteKind } from "../__test/test-utils";
import { Filters } from "./filters";

describe("Datastore repository indexing", () => {
  const kind = "TestItem";
  let datastore: Datastore;

  beforeAll(async () => (datastore = connectDatastoreEmulator()));
  beforeEach(async () => {
    await deleteKind(datastore, kind);
    jest.clearAllMocks();
  });

  const expectQueryMatch = async <T extends StringIdEntity>(
    repository: DatastoreRepository<T>,
    filters: Filters<T>,
    expectedId = "123"
  ) => {
    const [results] = await repository.query({ filters });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe(expectedId);
  };

  const expectQueryError = async <T extends StringIdEntity>(
    repository: DatastoreRepository<T>,
    filters: Filters<T>,
    message: string
  ) => {
    await expect(() => repository.query({ filters })).rejects.toThrow(message);
  };

  it("allows indexing and filtering string field types", async () => {
    type Indexable = {
      id: string;
      stringRequired: string;
      stringOptional?: string;
      stringNullable: string | null;
      stringOptionalNullable?: string | null;
    };
    const repository = new DatastoreRepository<Indexable>(kind, {
      datastore,
      index: {
        stringRequired: true,
        stringOptional: true,
        stringNullable: true,
        stringOptionalNullable: true,
      },
    });

    await repository.insert([
      {
        id: "123",
        stringRequired: "abc",
        stringOptional: "def",
        stringNullable: "ghi",
        stringOptionalNullable: "jkl",
      },
      {
        id: "234",
        stringRequired: "xyz",
        stringOptional: undefined,
        stringNullable: null,
        stringOptionalNullable: null,
      },
    ]);

    await expectQueryMatch(repository, { stringRequired: "abc" });
    await expectQueryMatch(repository, { stringRequired: { op: "=", value: "abc" } });
    await expectQueryMatch(repository, { stringOptional: "def" });
    await expectQueryMatch(repository, { stringOptional: { op: "=", value: "def" } });
    await expectQueryMatch(repository, { stringNullable: "ghi" });
    await expectQueryMatch(repository, { stringNullable: null }, "234");
    await expectQueryMatch(repository, { stringNullable: { op: "=", value: null } }, "234");
    await expectQueryMatch(repository, { stringOptionalNullable: "jkl" });
    await expectQueryMatch(repository, { stringOptionalNullable: null }, "234");
    await expectQueryMatch(repository, { stringOptionalNullable: { op: "=", value: null } }, "234");
    await expectQueryError(
      repository,
      { stringOptionalNullable: undefined },
      "Attempt to filter by undefined value for property 'stringOptionalNullable'"
    );
  });

  it("allows indexing array field types", async () => {
    type Indexable = {
      id: string;
      arrayRequired: string[];
      arrayOptional?: string[];
      arrayNullable: string[] | null;
      arrayOptionalNullable?: string[] | null;
    };
    const repository = new DatastoreRepository<Indexable>(kind, {
      datastore,
      index: {
        arrayRequired: true,
        arrayOptional: true,
        arrayNullable: true,
        arrayOptionalNullable: true,
      },
    });

    await repository.insert([
      {
        id: "123",
        arrayRequired: ["abc"],
        arrayOptional: ["def"],
        arrayNullable: ["ghi"],
        arrayOptionalNullable: ["jkl"],
      },
      {
        id: "234",
        arrayRequired: ["xyz"],
        arrayOptional: undefined,
        arrayNullable: null,
        arrayOptionalNullable: null,
      },
    ]);

    await expectQueryMatch(repository, { arrayRequired: "abc" });
    await expectQueryMatch(repository, { arrayOptional: "def" });
    await expectQueryMatch(repository, { arrayNullable: "ghi" });
    await expectQueryMatch(repository, { arrayNullable: null }, "234");
    await expectQueryMatch(repository, { arrayNullable: { op: "=", value: null } }, "234");
    await expectQueryMatch(repository, { arrayOptionalNullable: "jkl" });
    await expectQueryMatch(repository, { arrayOptionalNullable: null }, "234");
    await expectQueryMatch(repository, { arrayOptionalNullable: { op: "=", value: null } }, "234");
  });

  it("allows indexing arrays of objects", async () => {
    type Nestable = {
      stringRequired: string;
      stringOptional?: string;
      stringNullable: string | null;
      stringOptionalNullable?: string | null;
    };
    type Indexable = {
      id: string;
      nestedRequired: Nestable[];
      nestedOptional?: Nestable[];
      nestedNullable: Nestable[] | null;
      nestedOptionalNullable?: Nestable[] | null;
    };

    const repository = new DatastoreRepository<Indexable>(kind, {
      datastore,
      index: {
        nestedRequired: {
          stringRequired: true,
          stringOptional: true,
          stringNullable: true,
          stringOptionalNullable: true,
        },
        nestedOptional: {
          stringRequired: true,
          stringOptional: true,
          stringNullable: true,
          stringOptionalNullable: true,
        },
        nestedNullable: {
          stringRequired: true,
          stringOptional: true,
          stringNullable: true,
          stringOptionalNullable: true,
        },
        nestedOptionalNullable: {
          stringRequired: true,
          stringOptional: true,
          stringNullable: true,
          stringOptionalNullable: true,
        },
      },
    });

    const nested = {
      stringRequired: "abc",
      stringOptional: "def",
      stringNullable: "ghi",
      stringOptionalNullable: "jkl",
    };

    const nestedNull = {
      stringRequired: "xyz",
      stringOptional: undefined,
      stringNullable: null,
      stringOptionalNullable: null,
    };

    await repository.insert([
      {
        id: "123",
        nestedRequired: [{ ...nested }],
        nestedOptional: [{ ...nested }],
        nestedNullable: [{ ...nested }],
        nestedOptionalNullable: [{ ...nested }],
      },
      {
        id: "234",
        nestedRequired: [{ ...nestedNull }],
        nestedOptional: [{ ...nestedNull }],
        nestedNullable: [{ ...nestedNull }],
        nestedOptionalNullable: [{ ...nestedNull }],
      },
    ]);

    await expectQueryMatch(repository, { nestedRequired: { stringRequired: "abc" } });
    await expectQueryMatch(repository, { nestedRequired: { stringOptional: "def" } });
    await expectQueryMatch(repository, { nestedRequired: { stringNullable: "ghi" } });
    await expectQueryMatch(repository, { nestedRequired: { stringNullable: null } }, "234");
    await expectQueryMatch(repository, { nestedRequired: { stringNullable: { op: "=", value: null } } }, "234");
    await expectQueryMatch(repository, { nestedRequired: { stringOptionalNullable: "jkl" } });
    await expectQueryMatch(repository, { nestedRequired: { stringOptionalNullable: null } }, "234");
    await expectQueryMatch(repository, { nestedRequired: { stringOptionalNullable: { op: "=", value: null } } }, "234");

    await expectQueryMatch(repository, { nestedOptional: { stringRequired: "abc" } });
    await expectQueryMatch(repository, { nestedOptional: { stringOptional: "def" } });
    await expectQueryMatch(repository, { nestedOptional: { stringNullable: "ghi" } });
    await expectQueryMatch(repository, { nestedOptional: { stringNullable: null } }, "234");
    await expectQueryMatch(repository, { nestedOptional: { stringNullable: { op: "=", value: null } } }, "234");
    await expectQueryMatch(repository, { nestedOptional: { stringOptionalNullable: "jkl" } });
    await expectQueryMatch(repository, { nestedOptional: { stringOptionalNullable: null } }, "234");
    await expectQueryMatch(repository, { nestedOptional: { stringOptionalNullable: { op: "=", value: null } } }, "234");

    await expectQueryMatch(repository, { nestedNullable: { stringRequired: "abc" } });
    await expectQueryMatch(repository, { nestedNullable: { stringOptional: "def" } });
    await expectQueryMatch(repository, { nestedNullable: { stringNullable: "ghi" } });
    await expectQueryMatch(repository, { nestedNullable: { stringNullable: null } }, "234");
    await expectQueryMatch(repository, { nestedNullable: { stringNullable: { op: "=", value: null } } }, "234");
    await expectQueryMatch(repository, { nestedNullable: { stringOptionalNullable: "jkl" } });
    await expectQueryMatch(repository, { nestedNullable: { stringOptionalNullable: null } }, "234");
    await expectQueryMatch(repository, { nestedNullable: { stringOptionalNullable: { op: "=", value: null } } }, "234");

    await expectQueryMatch(repository, { nestedOptionalNullable: { stringRequired: "abc" } });
    await expectQueryMatch(repository, { nestedOptionalNullable: { stringOptional: "def" } });
    await expectQueryMatch(repository, { nestedOptionalNullable: { stringNullable: "ghi" } });
    await expectQueryMatch(repository, { nestedOptionalNullable: { stringNullable: null } }, "234");
    await expectQueryMatch(repository, { nestedOptionalNullable: { stringNullable: { op: "=", value: null } } }, "234");
    await expectQueryMatch(repository, { nestedOptionalNullable: { stringOptionalNullable: "jkl" } });
    await expectQueryMatch(repository, { nestedOptionalNullable: { stringOptionalNullable: null } }, "234");
    await expectQueryMatch(
      repository,
      { nestedOptionalNullable: { stringOptionalNullable: { op: "=", value: null } } },
      "234"
    );
  });

  describe("nested objects", () => {
    type Nestable = {
      stringRequired: string;
      stringOptional?: string;
      stringNullable: string | null;
      stringOptionalNullable?: string | null;
      deeper?: Nestable;
      deeperArray?: Nestable[];
    };
    type Indexable = {
      id: string;
      nestedRequired: Nestable;
      nestedOptional?: Nestable;
      nestedNullable: Nestable | null;
      nestedOptionalNullable?: Nestable | null;
    };
    let repository: DatastoreRepository<Indexable>;

    beforeEach(async () => {
      repository = new DatastoreRepository<Indexable>(kind, {
        datastore,
        index: {
          nestedRequired: {
            stringRequired: true,
            stringOptional: true,
            stringNullable: true,
            stringOptionalNullable: true,
            deeper: true,
          },
          nestedOptional: {
            stringRequired: true,
            stringOptional: true,
            stringNullable: true,
            stringOptionalNullable: true,
            deeper: {
              deeperArray: true,
            },
          },
          nestedNullable: {
            stringRequired: true,
            stringOptional: true,
            stringNullable: true,
            stringOptionalNullable: true,
          },
          nestedOptionalNullable: {
            stringRequired: true,
            stringOptional: true,
            stringNullable: true,
            stringOptionalNullable: true,
          },
        },
      });

      const nested = {
        stringRequired: "abc",
        stringOptional: "def",
        stringNullable: "ghi",
        stringOptionalNullable: "jkl",
      };

      const nestedNull = {
        stringRequired: "xyz",
        stringOptional: undefined,
        stringNullable: null,
        stringOptionalNullable: null,
      };

      await repository.insert([
        {
          id: "123",
          nestedRequired: { ...nested, deeper: { ...nested, deeper: { ...nested } } },
          nestedOptional: { ...nested, deeper: { ...nested, deeperArray: [{ ...nested }] } },
          nestedNullable: { ...nested },
          nestedOptionalNullable: { ...nested },
        },
        {
          id: "234",
          nestedRequired: { ...nestedNull, deeper: { ...nestedNull, deeper: { ...nestedNull } } },
          nestedOptional: { ...nestedNull, deeper: { ...nestedNull, deeperArray: [{ ...nestedNull }] } },
          nestedNullable: { ...nestedNull },
          nestedOptionalNullable: { ...nestedNull },
        },
      ]);
    });

    it("allows querying by nested objects", async () => {
      await expectQueryMatch(repository, { nestedRequired: { stringRequired: "abc" } });
      await expectQueryMatch(repository, { nestedRequired: { stringOptional: "def" } });
      await expectQueryMatch(repository, { nestedRequired: { stringNullable: "ghi" } });
      await expectQueryMatch(repository, { nestedRequired: { stringNullable: null } }, "234");
      await expectQueryMatch(repository, { nestedRequired: { stringNullable: { op: "=", value: null } } }, "234");
      await expectQueryMatch(repository, { nestedRequired: { stringOptionalNullable: "jkl" } });
      await expectQueryMatch(repository, { nestedRequired: { stringOptionalNullable: null } }, "234");
      await expectQueryMatch(
        repository,
        { nestedRequired: { stringOptionalNullable: { op: "=", value: null } } },
        "234"
      );
      await expectQueryMatch(repository, { nestedRequired: { deeper: { deeper: { stringRequired: "abc" } } } });
      await expectQueryMatch(repository, { nestedRequired: { deeper: { deeper: { stringNullable: null } } } }, "234");
      await expectQueryMatch(repository, { nestedOptional: { stringRequired: "abc" } });
      await expectQueryMatch(repository, { nestedOptional: { stringOptional: "def" } });
      await expectQueryMatch(repository, { nestedOptional: { stringNullable: "ghi" } });
      await expectQueryMatch(repository, { nestedOptional: { stringNullable: null } }, "234");
      await expectQueryMatch(repository, { nestedOptional: { stringNullable: { op: "=", value: null } } }, "234");
      await expectQueryMatch(repository, { nestedOptional: { stringOptionalNullable: "jkl" } });
      await expectQueryMatch(repository, { nestedOptional: { deeper: { deeperArray: { stringRequired: "abc" } } } });
      await expectQueryMatch(repository, { nestedOptional: { deeper: { deeperArray: { stringRequired: "abc" } } } });
      await expectQueryMatch(
        repository,
        { nestedOptional: { deeper: { deeperArray: { stringNullable: null } } } },
        "234"
      );

      await expectQueryMatch(repository, { nestedNullable: { stringRequired: "abc" } });
      await expectQueryMatch(repository, { nestedNullable: { stringOptional: "def" } });
      await expectQueryMatch(repository, { nestedNullable: { stringNullable: "ghi" } });
      await expectQueryMatch(repository, { nestedNullable: { stringNullable: null } }, "234");
      await expectQueryMatch(repository, { nestedNullable: { stringNullable: { op: "=", value: null } } }, "234");
      await expectQueryMatch(repository, { nestedNullable: { stringOptionalNullable: "jkl" } });
      await expectQueryMatch(repository, { nestedNullable: { stringOptionalNullable: null } }, "234");
      await expectQueryMatch(
        repository,
        { nestedNullable: { stringOptionalNullable: { op: "=", value: null } } },
        "234"
      );

      await expectQueryMatch(repository, { nestedOptionalNullable: { stringRequired: "abc" } });
      await expectQueryMatch(repository, { nestedOptionalNullable: { stringOptional: "def" } });
      await expectQueryMatch(repository, { nestedOptionalNullable: { stringNullable: "ghi" } });
      await expectQueryMatch(repository, { nestedOptionalNullable: { stringNullable: null } }, "234");
      await expectQueryMatch(
        repository,
        { nestedOptionalNullable: { stringNullable: { op: "=", value: null } } },
        "234"
      );
      await expectQueryMatch(repository, { nestedOptionalNullable: { stringOptionalNullable: "jkl" } });
      await expectQueryMatch(repository, { nestedOptionalNullable: { stringOptionalNullable: null } }, "234");
      await expectQueryMatch(
        repository,
        { nestedOptionalNullable: { stringOptionalNullable: { op: "=", value: null } } },
        "234"
      );
    });

    it("allows sorting by nested objects", async () => {
      const results1 = await repository.queryList({
        sort: { property: "nestedRequired.deeper.deeper.stringRequired", options: { descending: true } },
      });
      expect(results1.length).toBe(2);
      expect(results1[0].id).toBe("234");

      const results2 = await repository.queryList({
        sort: { property: "nestedRequired.deeper.deeper.stringNullable", options: { descending: true } },
      });
      expect(results2.length).toBe(2);
      expect(results2[0].id).toBe("123");
    });
  });
});
