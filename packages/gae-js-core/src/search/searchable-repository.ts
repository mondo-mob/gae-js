import { IndexEntry, Page, SearchFields, SearchService, Sort } from "./search.service";
import { BaseEntity, Repository } from "../data/repository";
import { createLogger } from "../logging";
import { asArray, OneOrMany } from "../util";
import { searchProvider } from "./search-provider";

export interface SearchResults<T> {
  resultCount: number;
  limit: number;
  offset: number;
  results: ReadonlyArray<T> | undefined;
}

export type IndexConfig<T> = Record<string, true | ((value: T) => unknown)>;

export interface SearchableRepositoryOptions<T extends { id: any }> {
  indexName: string;
  indexConfig: IndexConfig<T>;
  searchService?: SearchService;
}

export class SearchableRepository<T extends BaseEntity, Q = any, QR = any> implements Repository<T, Q, QR> {
  private logger = createLogger("searchable-repository");

  constructor(
    protected readonly repository: Repository<T>,
    protected readonly options: SearchableRepositoryOptions<T>
  ) {}

  async get(id: string): Promise<T | null>;
  async get(id: ReadonlyArray<string>): Promise<ReadonlyArray<T>>;
  async get(ids: string | ReadonlyArray<string>): Promise<OneOrMany<T | null>> {
    return this.repository.get(ids);
  }

  async save(entities: T): Promise<T>;
  async save(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async save(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    const savedEntities = await this.repository.save(entities as any);
    await this.index(savedEntities);
    return savedEntities;
  }

  async update(entities: T): Promise<T>;
  async update(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async update(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    const savedEntities = await this.repository.update(entities as any);
    await this.index(savedEntities);
    return savedEntities;
  }

  async insert(entities: T): Promise<T>;
  async insert(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async insert(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    const savedEntities = await this.repository.insert(entities as any);
    await this.index(savedEntities);
    return savedEntities;
  }

  async upsert(entities: T): Promise<T>;
  async upsert(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async upsert(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    const savedEntities = await this.repository.upsert(entities as any);
    await this.index(savedEntities);
    return savedEntities;
  }

  async delete(...ids: string[]): Promise<void> {
    await this.repository.delete(...ids);
    await this.getSearchService().delete(this.options.indexName, ...ids);
  }

  async deleteAll(): Promise<void> {
    await this.repository.deleteAll();
    await this.getSearchService().deleteAll(this.options.indexName);
  }

  async search(searchFields: SearchFields, sort?: Sort, page?: Page): Promise<SearchResults<T>> {
    const queryResults = await this.getSearchService().query(this.options.indexName, searchFields, sort, page);
    const requests = await this.fetchResults(queryResults.ids);
    return {
      resultCount: queryResults.resultCount,
      limit: queryResults.limit,
      offset: queryResults.offset,
      results: requests,
    };
  }

  async query(options: Partial<Q> = {}): Promise<QR> {
    return this.repository.query(options);
  }

  /**
   * Default indexing takes the raw entity values of the fields defined in the searchIndex config.
   * Override this if you wish to populate custom values such as splitting a string into n-grams
   * or combining multiple fields into a single indexed value.
   * @param entity entity to index
   * @return search index entry
   */
  protected prepareSearchEntry(entity: T): IndexEntry {
    const fields = Object.entries(this.options.indexConfig).reduce((acc, [fieldName, option]) => {
      acc[fieldName] = option === true ? (entity as any)[fieldName] : option(entity);
      return acc;
    }, {} as { [key: string]: unknown });

    return {
      id: entity.id,
      fields,
    };
  }

  protected prepareSearchEntries(entities: OneOrMany<T>): IndexEntry[] {
    return asArray(entities).map((entity) => this.prepareSearchEntry(entity));
  }

  private index(entities: OneOrMany<T>) {
    const entries = this.prepareSearchEntries(entities);
    return this.getSearchService().index(this.options.indexName, entries);
  }

  private async fetchResults(ids: string[]) {
    const results = await this.get(ids);
    if (results && results.some((result) => !result)) {
      this.logger.warn("Search results contained at least one null value - search index likely out of sync with db");
      return results.filter((result) => !!result);
    }
    return results;
  }

  private getSearchService = (): SearchService => {
    return this.options.searchService ?? searchProvider.get();
  };
}
