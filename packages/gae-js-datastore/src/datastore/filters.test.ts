import { buildFilters, Filters } from "./filters";

const buildQuery = () => {
  const query = {
    filter: jest.fn(),
  };

  query.filter.mockReturnValue(query);

  return query;
};

type SimpleStatus = "status1" | "status2";

interface Simple {
  testNumber1: number;
  testNumber2: number;
  nested: {
    nested1: number;
  };
  testNumbers: number[];
  testUnion: SimpleStatus;
  testUnions: SimpleStatus[];
}

describe("filters", () => {
  it("should build up empty filter", () => {
    const query = buildQuery();

    buildFilters(query, {});

    expect(query.filter).not.toHaveBeenCalled();
  });

  it("should build up simple filter", () => {
    const query = buildQuery();

    const filters: Filters<Simple> = { testNumber1: 123 };
    buildFilters(query, filters);

    expect(query.filter).toHaveBeenCalledWith("testNumber1", 123);
  });

  it("should build up several filters", () => {
    const query = buildQuery();

    const filters: Filters<Simple> = { testNumber1: 123, testNumber2: 1234 };
    buildFilters(query, filters);

    expect(query.filter).toHaveBeenCalledWith("testNumber1", 123);
    expect(query.filter).toHaveBeenCalledWith("testNumber2", 1234);
  });

  it("should build up complex filters", () => {
    const query = buildQuery();

    const filters: Filters<Simple> = {
      testNumber1: {
        op: ">",
        value: 123,
      },
    };
    buildFilters(query, filters);

    expect(query.filter).toHaveBeenCalledWith("testNumber1", ">", 123);
  });

  it("should build up complex range filters", () => {
    const query = buildQuery();

    const filters: Filters<Simple> = {
      testNumber1: [
        {
          op: ">",
          value: 123,
        },
        {
          op: "<",
          value: 134,
        },
      ],
    };
    buildFilters(query, filters);

    expect(query.filter).toHaveBeenCalledWith("testNumber1", ">", 123);
    expect(query.filter).toHaveBeenCalledWith("testNumber1", "<", 134);
  });

  it("should build up nested property filters", () => {
    const query = buildQuery();

    const filters: Filters<Simple> = {
      nested: {
        nested1: 123,
      },
    };
    buildFilters(query, filters);

    expect(query.filter).toHaveBeenCalledWith("nested.nested1", 123);
  });

  it("should build up nested complex property filters", () => {
    const query = buildQuery();

    const filters: Filters<Simple> = {
      nested: {
        nested1: {
          op: ">",
          value: 123,
        },
      },
    };
    buildFilters(query, filters);

    expect(query.filter).toHaveBeenCalledWith("nested.nested1", ">", 123);
  });

  it("should allow multiple entries for same field", () => {
    const query = buildQuery();

    const filters: Filters<Simple> = {
      testNumber1: [123, 456],
      testNumbers: [123, 456],
    };
    buildFilters(query, filters);

    expect(query.filter).toHaveBeenCalledWith("testNumber1", 123);
    expect(query.filter).toHaveBeenCalledWith("testNumber1", 456);
    expect(query.filter).toHaveBeenCalledWith("testNumbers", 123);
    expect(query.filter).toHaveBeenCalledWith("testNumbers", 456);
  });

  it("should allow multiple entries for union field", () => {
    const query = buildQuery();

    const filters: Filters<Simple> = {
      testUnion: ["status1", "status2"],
      testUnions: ["status1", "status2"],
    };
    buildFilters(query, filters);

    expect(query.filter).toHaveBeenCalledWith("testUnion", "status1");
    expect(query.filter).toHaveBeenCalledWith("testUnion", "status2");
    expect(query.filter).toHaveBeenCalledWith("testUnions", "status1");
    expect(query.filter).toHaveBeenCalledWith("testUnions", "status2");
  });
});
