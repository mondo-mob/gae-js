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
    filters: Filters<T>
  ) => {
    const [results] = await repository.query({ filters });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("123");
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
    ]);

    await expectQueryMatch(repository, { stringRequired: "abc" });
    await expectQueryMatch(repository, { stringOptional: "def" });
    await expectQueryMatch(repository, { stringNullable: "ghi" });
    await expectQueryMatch(repository, { stringOptionalNullable: "jkl" });
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
    ]);

    await expectQueryMatch(repository, { arrayRequired: "abc" });
    await expectQueryMatch(repository, { arrayOptional: "def" });
    await expectQueryMatch(repository, { arrayNullable: "ghi" });
    await expectQueryMatch(repository, { arrayOptionalNullable: "jkl" });
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

    await repository.insert([
      {
        id: "123",
        nestedRequired: [{ ...nested }],
        nestedOptional: [{ ...nested }],
        nestedNullable: [{ ...nested }],
        nestedOptionalNullable: [{ ...nested }],
      },
    ]);

    await expectQueryMatch(repository, { nestedRequired: { stringRequired: "abc" } });
    await expectQueryMatch(repository, { nestedRequired: { stringOptional: "def" } });
    await expectQueryMatch(repository, { nestedRequired: { stringNullable: "ghi" } });
    await expectQueryMatch(repository, { nestedRequired: { stringOptionalNullable: "jkl" } });

    await expectQueryMatch(repository, { nestedOptional: { stringRequired: "abc" } });
    await expectQueryMatch(repository, { nestedOptional: { stringOptional: "def" } });
    await expectQueryMatch(repository, { nestedOptional: { stringNullable: "ghi" } });
    await expectQueryMatch(repository, { nestedOptional: { stringOptionalNullable: "jkl" } });

    await expectQueryMatch(repository, { nestedNullable: { stringRequired: "abc" } });
    await expectQueryMatch(repository, { nestedNullable: { stringOptional: "def" } });
    await expectQueryMatch(repository, { nestedNullable: { stringNullable: "ghi" } });
    await expectQueryMatch(repository, { nestedNullable: { stringOptionalNullable: "jkl" } });

    await expectQueryMatch(repository, { nestedOptionalNullable: { stringRequired: "abc" } });
    await expectQueryMatch(repository, { nestedOptionalNullable: { stringOptional: "def" } });
    await expectQueryMatch(repository, { nestedOptionalNullable: { stringNullable: "ghi" } });
    await expectQueryMatch(repository, { nestedOptionalNullable: { stringOptionalNullable: "jkl" } });
  });

  it("allows indexing nested objects", async () => {
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

    const repository = new DatastoreRepository<Indexable>(kind, {
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

    await repository.insert([
      {
        id: "123",
        nestedRequired: { ...nested, deeper: { ...nested, deeper: { ...nested } } },
        nestedOptional: { ...nested, deeper: { ...nested, deeperArray: [{ ...nested }] } },
        nestedNullable: { ...nested },
        nestedOptionalNullable: { ...nested },
      },
    ]);

    await expectQueryMatch(repository, { nestedRequired: { stringRequired: "abc" } });
    await expectQueryMatch(repository, { nestedRequired: { stringOptional: "def" } });
    await expectQueryMatch(repository, { nestedRequired: { stringNullable: "ghi" } });
    await expectQueryMatch(repository, { nestedRequired: { stringOptionalNullable: "jkl" } });
    await expectQueryMatch(repository, { nestedRequired: { deeper: { deeper: { stringRequired: "abc" } } } });

    await expectQueryMatch(repository, { nestedOptional: { stringRequired: "abc" } });
    await expectQueryMatch(repository, { nestedOptional: { stringOptional: "def" } });
    await expectQueryMatch(repository, { nestedOptional: { stringNullable: "ghi" } });
    await expectQueryMatch(repository, { nestedOptional: { stringOptionalNullable: "jkl" } });
    await expectQueryMatch(repository, { nestedOptional: { deeper: { deeperArray: { stringRequired: "abc" } } } });

    await expectQueryMatch(repository, { nestedNullable: { stringRequired: "abc" } });
    await expectQueryMatch(repository, { nestedNullable: { stringOptional: "def" } });
    await expectQueryMatch(repository, { nestedNullable: { stringNullable: "ghi" } });
    await expectQueryMatch(repository, { nestedNullable: { stringOptionalNullable: "jkl" } });

    await expectQueryMatch(repository, { nestedOptionalNullable: { stringRequired: "abc" } });
    await expectQueryMatch(repository, { nestedOptionalNullable: { stringOptional: "def" } });
    await expectQueryMatch(repository, { nestedOptionalNullable: { stringNullable: "ghi" } });
    await expectQueryMatch(repository, { nestedOptionalNullable: { stringOptionalNullable: "jkl" } });
  });
});
