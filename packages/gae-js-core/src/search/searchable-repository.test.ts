import { IndexEntry, Page, SearchFields, SearchService, Sort } from "./search.service";
import { MockRepository } from "../data/mock-repository";
import { IndexConfig, SearchableRepository } from "./searchable-repository";

interface Item {
  id: string;
  text1: string;
  text2: string;
  text3: string;
  nested: {
    text4: string;
  };
}

describe("SearchableRepository", () => {
  const searchService: SearchService = {
    index: jest.fn(),
    delete: jest.fn(),
    deleteAll: jest.fn(),
    query: jest.fn(),
  };

  let searchableRepository: SearchableRepository<Item>;

  const initRepo = (indexConfig: IndexConfig<Item>): SearchableRepository<Item> =>
    new SearchableRepository(new MockRepository<Item>(), {
      searchService: searchService,
      indexName: "item",
      indexConfig,
    });

  const createItem = (id: string): Item => ({
    id,
    text1: `${id}_text1`,
    text2: `${id}_text2`,
    text3: `${id}_text3`,
    nested: {
      text4: `${id}_text4`,
    },
  });

  beforeEach(() => {
    jest.resetAllMocks();
    searchableRepository = initRepo({
      text1: true,
      text2: (value) => value.text2.toUpperCase(),
      nested: true,
      custom: (value) => `custom_${value.text3}`,
    });
  });

  const itIndexesEntitiesForOperation = (operation: string) => {
    const verifyIndexEntries = (entries: IndexEntry[]) => {
      expect(searchService.index).toHaveBeenCalledWith("item", entries);
    };

    it("indexes fields in repository config (single item)", async () => {
      const item = createItem("item1");

      await (searchableRepository as any)[operation](item);

      verifyIndexEntries([
        {
          id: "item1",
          fields: {
            text1: "item1_text1",
            text2: "ITEM1_TEXT2",
            nested: {
              text4: "item1_text4",
            },
            custom: "custom_item1_text3",
          },
        },
      ]);
    });

    it("indexes fields in repository config (multiple items)", async () => {
      const item1 = createItem("item1");
      const item2 = createItem("item2");

      await (searchableRepository as any)[operation]([item1, item2]);

      verifyIndexEntries([
        {
          id: "item1",
          fields: {
            text1: "item1_text1",
            text2: "ITEM1_TEXT2",
            nested: {
              text4: "item1_text4",
            },
            custom: "custom_item1_text3",
          },
        },
        {
          id: "item2",
          fields: {
            text1: "item2_text1",
            text2: "ITEM2_TEXT2",
            nested: {
              text4: "item2_text4",
            },
            custom: "custom_item2_text3",
          },
        },
      ]);
    });
  };

  describe("save", () => {
    itIndexesEntitiesForOperation("save");
  });

  describe("update", () => {
    itIndexesEntitiesForOperation("update");
  });

  describe("insert", () => {
    itIndexesEntitiesForOperation("insert");
  });

  describe("upsert", () => {
    itIndexesEntitiesForOperation("upsert");
  });

  describe("delete", () => {
    it("requests index deletion (single item)", async () => {
      await searchableRepository.delete("item1");

      expect(searchService.delete).toHaveBeenCalledWith("item", "item1");
    });

    it("requests index deletion (multiple items)", async () => {
      await searchableRepository.delete("item1", "item2");

      expect(searchService.delete).toHaveBeenCalledWith("item", "item1", "item2");
    });
  });

  describe("deleteAll", () => {
    it("requests search index deletion of all items", async () => {
      await searchableRepository.deleteAll();

      expect(searchService.deleteAll).toHaveBeenCalledWith("item");
    });
  });

  describe("search", () => {
    it("searches and fetches results", async () => {
      const searchFields: SearchFields = {
        text1: "text1",
      };
      const sort: Sort = {
        field: "text1",
      };
      const page: Page = {
        limit: 10,
        offset: 10,
      };

      (searchService as any).query.mockImplementation(async () => ({
        resultCount: 2,
        limit: 10,
        offset: 10,
        ids: ["item1", "item2"],
      }));

      await searchableRepository.save([createItem("item1"), createItem("item2")]);

      const results = await searchableRepository.search(searchFields, sort, page);

      expect(results).toEqual({
        resultCount: 2,
        limit: 10,
        offset: 10,
        results: expect.arrayContaining([
          expect.objectContaining({ id: "item1" }),
          expect.objectContaining({ id: "item2" }),
        ]),
      });
    });
  });
});
