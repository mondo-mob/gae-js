import { IndexEntry, Page, SearchFields, Sort } from "./search.service";

export interface SearchResults<T> {
  resultCount: number;
  limit: number;
  offset: number;
  results: ReadonlyArray<T> | undefined;
}

export type IndexConfig<T> = Record<string, true | ((value: T) => unknown)>;

export interface Searchable<T> {
  search(searchFields: SearchFields, sort?: Sort, page?: Page): Promise<SearchResults<T>>;
}

const defaultIdFactory = <T extends { id: string }>(entity: T): string => {
  return entity.id;
};

/**
 * Default indexing for search:
 * - for entries marked as "true" in the indexConfig, the raw entity values of the fields are used
 * - for entries configured with a function, the value is the result of passing the entity into the function
 * @param indexConfig the index configuration for this type of entity
 * @param entity entity to index
 * @param searchIdFactory optional function to convert entity to search id string
 * @return search index entry
 */
export const prepareIndexEntry = <T extends { id: string }>(
  indexConfig: IndexConfig<T>,
  entity: T,
  searchIdFactory: (entity: T) => string = defaultIdFactory
): IndexEntry => {
  const fields = Object.entries(indexConfig).reduce((acc, [fieldName, option]) => {
    acc[fieldName] = option === true ? (entity as any)[fieldName] : option(entity);
    return acc;
  }, {} as { [key: string]: unknown });

  return {
    id: searchIdFactory(entity),
    fields,
  };
};
