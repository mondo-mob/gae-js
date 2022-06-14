import { Datastore } from "@google-cloud/datastore";
import { entity as Entity } from "@google-cloud/datastore/build/src/entity";
import { chain, first, flatMap, omit } from "lodash";
import {
  asArray,
  createLogger,
  DataValidator,
  IndexConfig,
  IndexEntry,
  OneOrMany,
  Page,
  prepareIndexEntry,
  Searchable,
  SearchFields,
  searchProvider,
  SearchResults,
  SearchService,
  Sort,
} from "@mondomob/gae-js-core";
import {
  DatastoreEntity,
  DatastoreLoader,
  DatastorePayload,
  Index,
  QueryOptions,
  QueryResponse,
} from "./datastore-loader";
import { datastoreLoaderRequestStorage } from "./datastore-request-storage";
import { datastoreProvider } from "./datastore-provider";
import assert from "assert";

const SEARCH_NOT_ENABLED_MSG = "Search is not configured for this repository";

export interface BaseEntity {
  id: string;
}

export interface RepositorySearchOptions<T extends BaseEntity> {
  indexName: string;
  indexConfig: IndexConfig<T>;
  searchService?: SearchService;
}

export interface RepositoryOptions<T extends BaseEntity> {
  datastore?: Datastore;
  validator?: DataValidator<T>;
  defaultValues?: Partial<Omit<T, "id">>;
  index?: Index<Omit<T, "id">>;
  search?: RepositorySearchOptions<T>;
}

export function buildExclusions<T>(input: T, schema: Index<T> = {}, path = ""): string[] {
  if (schema === true) {
    return [];
  } else if (Array.isArray(input)) {
    return chain(input)
      .flatMap((value) => {
        return buildExclusions(value, schema, `${path}[]`);
      })
      .push(`${path}[]`)
      .uniq()
      .value();
  } else if (typeof input === "object") {
    const paths = flatMap<Record<string, unknown>, string>(input as any, (value, key) => {
      return buildExclusions(value, (schema as any)[key], `${path}${path.length > 0 ? "." : ""}${key}`);
    });

    if (path) {
      paths.push(path);
    }

    return paths;
  }

  return [path];
}

class LoadError extends Error {
  constructor(kind: string, id: string, message: string) {
    super(`"${kind}" with id "${id}" failed to load due to error:\n${message})}`);
  }
}

class SaveError extends Error {
  constructor(kind: string, id: string, message: string) {
    super(`"${kind}" with id "${id}" failed to save due to error:\n${message}`);
  }
}

export class DatastoreRepository<T extends BaseEntity> implements Searchable<T> {
  private readonly logger = createLogger("datastore-repository");
  private readonly validator?: DataValidator<T>;
  private readonly datastore?: Datastore;
  protected readonly searchOptions?: RepositorySearchOptions<T>;

  constructor(protected readonly kind: string, protected readonly options: RepositoryOptions<T>) {
    this.datastore = options?.datastore;
    this.validator = options.validator;
    this.searchOptions = options?.search;
  }

  public key = (name: string): Entity.Key => {
    return this.getDatastore().key([this.kind, name]);
  };

  private fromDatastoreEntity(datastoreEntity: DatastoreEntity): T {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const id = datastoreEntity[Datastore.KEY].name!;
    const data = omit(datastoreEntity, Datastore.KEY);
    return { ...(this.options.defaultValues as any), ...data, id };
  }

  async getRequired(id: string): Promise<T>;
  async getRequired(ids: ReadonlyArray<string>): Promise<T[]>;
  async getRequired(ids: string | ReadonlyArray<string>): Promise<OneOrMany<T>> {
    const isArrayParam = Array.isArray(ids);
    const idsArray = isArrayParam ? ids : [ids];
    const results = await this.get(idsArray);
    const nullIndex = results.indexOf(null);
    if (nullIndex >= 0) {
      throw new LoadError(this.kind, idsArray[nullIndex], "invalid id");
    }
    return isArrayParam ? (results as ReadonlyArray<T>) : (results[0] as T);
  }

  async exists(id: string): Promise<boolean> {
    const results = await this.getLoader().get([this.key(id)]);
    return first(results) !== null;
  }

  async get(id: string): Promise<T | null>;
  async get(ids: ReadonlyArray<string>): Promise<ReadonlyArray<T | null>>;
  async get(ids: string | ReadonlyArray<string>): Promise<OneOrMany<T | null>> {
    const idArray = asArray(ids);
    const allKeys = idArray.map(this.key);

    const results = await this.getLoader().get(allKeys);

    const validatedResults = results.map((result) => {
      if (result) {
        const entity = this.fromDatastoreEntity(result);
        return this.validateLoad(entity);
      }
      return result;
    });

    if (Array.isArray(ids)) {
      return validatedResults;
    } else {
      return validatedResults[0];
    }
  }

  async query(options: Partial<QueryOptions<T>> = {}): Promise<QueryResponse<T>> {
    const [results, queryInfo] = await this.getLoader().executeQuery<T>(this.kind, options);

    return [
      results.map<any>((value) => {
        const entity = this.fromDatastoreEntity(value);
        // Cannot run validation if performing query projection
        return options.select ? entity : this.validateLoad(entity);
      }),
      queryInfo,
    ];
  }

  async save(entities: T): Promise<T>;
  async save(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async save(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.applyMutation(this.beforePersist(entities), (loader, e) => loader.save(e));
  }

  async update(entities: T): Promise<T>;
  async update(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async update(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.applyMutation(this.beforePersist(entities), (loader, e) => loader.update(e));
  }

  async insert(entities: T): Promise<T>;
  async insert(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async insert(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.applyMutation(this.beforePersist(entities), (loader, e) => loader.insert(e));
  }

  async upsert(entities: T): Promise<T>;
  async upsert(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async upsert(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.applyMutation(this.beforePersist(entities), (loader, e) => loader.upsert(e));
  }

  /**
   * Common hook to allow sub-classes to do any transformations necessary before insert/update/save/upsert.
   *
   * By default this just returns the same entities and does not change input.
   *
   * @param entities Entities that will be persisted, optionally with any transformations.
   */
  protected beforePersist(entities: OneOrMany<T>): OneOrMany<T> {
    return entities;
  }

  /**
   * Reindex all entities in datastore
   *
   * Loads all entities into memory and applies some mutation to them before resaving them
   *
   * @param operation (Optional) The operation to perform on each entity, returning the new
   * form. By default this will return the same instance.
   */
  async reindex(operation: (input: T) => T | Promise<T> = (input) => input): Promise<ReadonlyArray<T>> {
    const [allEntities] = await this.query();

    const updatedEntities = await Promise.all(allEntities.map(operation));

    return this.update(updatedEntities);
  }

  async delete(...ids: string[]): Promise<void> {
    const allIds = ids.map((id) => this.key(id));
    await this.getLoader().delete(allIds);
    if (this.searchOptions) {
      await this.getSearchService().delete(this.searchOptions.indexName, ...ids);
    }
  }

  async deleteAll(): Promise<void> {
    const [allEntities] = await this.query();
    const allIds = allEntities.map((value) => this.key(value.id));
    await this.getLoader().delete(allIds);
    if (this.searchOptions) {
      await this.getSearchService().deleteAll(this.searchOptions.indexName);
    }
  }

  async search(searchFields: SearchFields, sort?: Sort, page?: Page): Promise<SearchResults<T>> {
    assert.ok(this.searchOptions, SEARCH_NOT_ENABLED_MSG);
    const queryResults = await this.getSearchService().query(this.searchOptions.indexName, searchFields, sort, page);
    const requests = await this.fetchSearchResults(queryResults.ids);
    return {
      resultCount: queryResults.resultCount,
      limit: queryResults.limit,
      offset: queryResults.offset,
      results: requests,
    };
  }

  protected validateLoad = (entity: T) => this.validateEntity(entity, LoadError);

  protected validateSave = (entity: T) => this.validateEntity(entity, SaveError);

  private validateEntity = (entity: T, errorClass: new (kind: string, id: string, message: string) => Error): T => {
    if (!this.validator) {
      return entity;
    }

    try {
      return this.validator(entity);
    } catch (e) {
      throw new errorClass(this.kind, entity.id, (e as Error).message);
    }
  };

  private async applyMutation(
    entities: OneOrMany<T>,
    mutation: (loader: DatastoreLoader, entities: ReadonlyArray<DatastorePayload>) => Promise<any>
  ): Promise<OneOrMany<T>> {
    const entitiesToSave = asArray(entities)
      .map(this.validateSave)
      .map((data) => {
        const withoutId = omit(data, "id");
        return {
          key: this.key(data.id),
          data: withoutId,
          excludeFromIndexes: buildExclusions(withoutId, this.options.index),
        } as DatastorePayload;
      });

    await mutation(this.getLoader(), entitiesToSave);
    if (this.searchOptions) {
      await this.indexForSearch(entities);
    }
    return entities;
  }

  protected prepareSearchEntry(entity: T): IndexEntry {
    assert.ok(this.searchOptions, SEARCH_NOT_ENABLED_MSG);
    return prepareIndexEntry(this.searchOptions.indexConfig, entity);
  }

  protected prepareSearchEntries(entities: OneOrMany<T>): IndexEntry[] {
    assert.ok(this.searchOptions, SEARCH_NOT_ENABLED_MSG);
    return asArray(entities).map((entity) => this.prepareSearchEntry(entity));
  }

  private indexForSearch(entities: OneOrMany<T>) {
    assert.ok(this.searchOptions, SEARCH_NOT_ENABLED_MSG);
    const entries = this.prepareSearchEntries(entities);
    return this.getSearchService().index(this.searchOptions.indexName, entries);
  }

  private async fetchSearchResults(ids: string[]): Promise<ReadonlyArray<T>> {
    const results = await this.get(ids);
    if (results.some((result) => !result)) {
      this.logger.warn("Search results contained at least one null value - search index likely out of sync with db");
    }
    return results.filter((result): result is T => !!result);
  }

  private getDatastore = (): Datastore => {
    return this.datastore ?? datastoreProvider.get();
  };

  private getLoader = (): DatastoreLoader => {
    const loader = datastoreLoaderRequestStorage.get();
    return loader ?? new DatastoreLoader(this.getDatastore());
  };

  private getSearchService = (): SearchService => {
    return this.searchOptions?.searchService ?? searchProvider.get();
  };
}
