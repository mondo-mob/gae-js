import { GaeSearchService } from "./gae-search-service";
import nock from "nock";
import { initTestConfig } from "./test-utils";
import { SearchService } from "@dotrun/gae-js-core";

describe("GaeSearchService", () => {
  const searchServiceEndpoint = "http://localhost:9999";
  let searchService: SearchService;

  beforeEach(async () => {
    await initTestConfig({
      searchServiceEndpoint,
    });
    searchService = new GaeSearchService();
    nock.disableNetConnect();
  });

  afterEach(async () => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe("index", () => {
    it("posts index request to search service", async () => {
      const indexName = "test-index";
      const entries = [
        {
          id: "item1",
          fields: {
            name: "item1",
          },
        },
      ];
      const expectedPayload = {
        entityName: "test-index",
        entries: [
          {
            id: "item1",
            fields: {
              name: "item1",
            },
          },
        ],
      };

      nock(searchServiceEndpoint).post("/index", expectedPayload).reply(204);
      await searchService.index(indexName, entries);
    });
  });

  describe("delete", () => {
    it("posts delete request to search service", async () => {
      const indexName = "test-index";
      const ids = ["123", "234"];
      const expectedPayload = {
        entityName: "test-index",
        ids: ["123", "234"],
      };

      nock(searchServiceEndpoint).post("/delete", expectedPayload).reply(204);
      await searchService.delete(indexName, ...ids);
    });
  });

  describe("deleteAll", () => {
    it("posts deleteAll request to search service", async () => {
      const indexName = "test-index";
      const expectedPayload = {
        entityName: "test-index",
      };

      nock(searchServiceEndpoint).post("/deleteAll", expectedPayload).reply(204);
      await searchService.deleteAll(indexName);
    });
  });

  describe("query", () => {
    it("posts query request to search service", async () => {
      const indexName = "test-index";
      const fields = {
        stringField: "abc",
        arrayField: ["abc", "def"],
        predicateField: {
          op: ">" as const,
          value: "XYZ",
        },
        predicateArrayField: [
          {
            op: ">" as const,
            value: "MMM",
          },
          {
            op: "<" as const,
            value: "SSS",
          },
        ],
      };
      const expectedPayload = {
        entityName: "test-index",
        fields: [
          { field: "stringField", op: "=", value: "abc" },
          { field: "arrayField", op: "=", value: ["abc", "def"] },
          { field: "predicateField", op: ">", value: "XYZ" },
          { field: "predicateArrayField", op: ">", value: "MMM" },
          { field: "predicateArrayField", op: "<", value: "SSS" },
        ],
        sort: undefined,
        page: undefined,
      };

      nock(searchServiceEndpoint)
        .post("/query", expectedPayload)
        .reply(200, {
          resultCount: 1,
          limit: 0,
          offset: 0,
          ids: ["123"],
        });
      await searchService.query(indexName, fields);
    });
  });
});
