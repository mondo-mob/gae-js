import {
  CollectionReference,
  DocumentReference,
  Firestore,
  Precondition,
  QuerySnapshot,
} from "@google-cloud/firestore";
import {
  createLogger,
  DataValidator,
  IndexConfig,
  IndexEntry,
  isReadonlyArray,
  OneOrMany,
  Page,
  prepareIndexEntry,
  SearchFields,
  searchProvider,
  SearchResults,
  SearchService,
  Sort,
} from "@mondomob/gae-js-core";
import assert from "assert";
import { castArray, first } from "lodash";
import { DeleteAllOptions, FirestoreLoader, FirestorePayload } from "./firestore-loader";
import { firestoreProvider } from "./firestore-provider";
import { FilterOptions, QueryOptions, QueryResponse } from "./firestore-query";
import { firestoreLoaderRequestStorage } from "./firestore-request-storage";
import { RepositoryError, RepositoryNotFoundError } from "./repository-error";
import { DateTransformers, transformDeep, ValueTransformer } from "./value-transformers";

const SEARCH_NOT_ENABLED_MSG = "Search is not configured for this repository";

// Keep this generic so we don't hardcode "string" everywhere, in case this ever changes
type IdType = string;

interface DocumentIdentifier {
  id: IdType;
  parentPath: string;
}

type IdQueryOptions<T> = Omit<QueryOptions<T>, "select">;

export interface BaseEntity {
  id: IdType;
}

export interface ValueTransformers<T> {
  read: ValueTransformer<T>[];
  write: ValueTransformer<T>[];
}

export interface RepositorySearchOptions<T extends BaseEntity> {
  indexName: string;
  indexConfig: IndexConfig<T>;
  searchService?: SearchService;
}

export interface RepositoryOptions<T extends BaseEntity> {
  firestore?: Firestore;
  validator?: DataValidator<T>;
  search?: RepositorySearchOptions<T>;
  valueTransformers?: ValueTransformers<T>;
}

export interface CollectionGroupQueryRepository<T> {
  countGroup(options: Partial<FilterOptions>): Promise<number>;
  queryGroup(options?: QueryOptions<T>): Promise<QueryResponse<T>>;
  queryGroupForIds(options?: IdQueryOptions<T>): Promise<QueryResponse<DocumentIdentifier>>;
}

export class FirestoreRepository<T extends BaseEntity> implements CollectionGroupQueryRepository<T> {
  private readonly logger = createLogger("firestore-repository");
  private readonly validator?: DataValidator<T>;
  private readonly firestore?: Firestore;
  protected readonly searchOptions?: RepositorySearchOptions<T>;
  protected readonly valueTransformers: ValueTransformers<T>;

  constructor(
    protected readonly collectionPath: string,
    {
      validator,
      firestore,
      search,
      valueTransformers = {
        write: [DateTransformers.write()],
        read: [DateTransformers.read()],
      },
    }: RepositoryOptions<T> = {}
  ) {
    this.validator = validator;
    this.firestore = firestore;
    this.searchOptions = search;
    this.valueTransformers = valueTransformers;
  }

  async getRequired(id: string): Promise<T>;
  async getRequired(ids: ReadonlyArray<string>): Promise<T[]>;
  async getRequired(ids: string | ReadonlyArray<string>): Promise<OneOrMany<T>> {
    const isArrayParam = Array.isArray(ids);
    const idsArray = isArrayParam ? ids : [ids];
    const results = await this.get(idsArray);
    const nullIndex = results.indexOf(null);
    if (nullIndex >= 0) {
      throw new RepositoryNotFoundError(this.collectionPath, idsArray[nullIndex]);
    }
    return isArrayParam ? (results as ReadonlyArray<T>) : (results[0] as T);
  }

  async exists(id: string): Promise<boolean> {
    const results = await this.getLoader().get([this.documentRef(id)]);
    return first(results) !== null;
  }

  async get(id: string): Promise<T | null>;
  async get(ids: ReadonlyArray<string>): Promise<ReadonlyArray<T | null>>;
  async get(ids: string | ReadonlyArray<string>): Promise<OneOrMany<T | null>> {
    const idArray = castArray(ids);
    const allKeys = idArray.map(this.documentRef);

    const results = await this.getLoader().get(allKeys);

    const validatedResults = results.map((result, idx) => {
      if (result) {
        const entity = this.createEntity(idArray[idx], result);
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

  async count(options: Partial<FilterOptions> = {}): Promise<number> {
    return this.getLoader().execCount(this.collectionPath, options);
  }

  /**
   * Performs a count of all matching documents for a collection group query against the collection id of
   * this repository.
   * @param options query options
   */
  async countGroup(options: Partial<FilterOptions> = {}): Promise<number> {
    return this.getLoader().execGroupCount(this.collectionRef().id, options);
  }

  async query(options: QueryOptions<T> = {}): Promise<QueryResponse<T>> {
    return this.dataQueryResponse(this.getLoader().executeQuery<T>(this.collectionPath, options));
  }

  /**
   * Performs a collection group query against the collection id of this repository.
   * @param options query options
   */
  async queryGroup(options: QueryOptions<T> = {}): Promise<QueryResponse<T>> {
    return this.dataQueryResponse(this.getLoader().executeGroupQuery<T>(this.collectionRef().id, options));
  }

  async queryForIds(options: IdQueryOptions<T> = {}): Promise<QueryResponse<IdType>> {
    const querySnapshot = await this.getLoader().executeQuery<T>(this.collectionPath, this.idOnlyQueryOptions(options));
    return querySnapshot.docs.map(({ ref }) => ref.id);
  }

  /**
   * Performs a collection group query against the collection id of this repository and returns
   * the ids for any matching documents.
   * @param options query options
   */
  async queryGroupForIds(options: IdQueryOptions<T> = {}): Promise<QueryResponse<DocumentIdentifier>> {
    const querySnapshot = await this.getLoader().executeGroupQuery<T>(
      this.collectionRef().id,
      this.idOnlyQueryOptions(options)
    );
    return querySnapshot.docs.map(({ ref }) => ({ id: ref.id, parentPath: ref.parent.path }));
  }

  /**
   * Common hook to allow sub-classes to do any transformations necessary after data is read from Firestore.
   *
   * By default, a single transform is executed which will convert all Firestore Timestamps back to Date.
   *
   * @param entity The entity read from Firestore.
   */
  protected afterRead(entity: T): T {
    return transformDeep(entity, this.valueTransformers.read);
  }

  async save(entities: T): Promise<T>;
  async save(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async save(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.applyMutation(this.beforePersistBatch(entities), (loader, e) => loader.set(e));
  }

  async insert(entities: T): Promise<T>;
  async insert(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async insert(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.applyMutation(this.beforePersistBatch(entities), (loader, e) => loader.create(e));
  }

  /**
   * Common hook to allow sub-classes to do any transformations necessary before insert/update/save/upsert.
   *
   * By default this just returns the same entity and does not change input.
   *
   * @param entity The entity to be persisted. This is either the source entity, or if the persist was called with an array then this is called for each one.
   */
  protected beforePersist(entity: T): T {
    return entity;
  }

  /**
   * If sub-classes need a hook before a holistic batch is persisted then this is the hook. Most times you should use beforePersist instead.
   *
   * Overriding this function without calling super.beforePersistBatch() will render any other beforePersist hooks useless. By default this calls
   * beforePersist for each instance.
   *
   * @param entities One or many entity instances
   * @protected
   */
  protected beforePersistBatch(entities: OneOrMany<T>): OneOrMany<T> {
    return mapOneOrMany(entities, (e) => this.beforePersist(e));
  }

  async delete(ids: OneOrMany<string>, precondition?: Precondition): Promise<void> {
    const idArray = castArray(ids);
    const allIds = idArray.map((id) => this.documentRef(id));
    await this.getLoader().delete(allIds, precondition);
    if (this.searchOptions) {
      await this.getSearchService().delete(this.searchOptions.indexName, ...idArray);
    }
  }

  async deleteAll(options?: DeleteAllOptions): Promise<void> {
    await this.getLoader().deleteAll(this.collectionPath, options);
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

  collectionRef = (): CollectionReference => {
    return this.getFirestore().collection(`${this.collectionPath}`);
  };

  documentRef = (name: string): DocumentReference => {
    return this.getFirestore().doc(`${this.collectionPath}/${name}`);
  };

  createEntity = (id: string, doc: Record<string, unknown>): T => {
    const transformed: T = this.afterRead(doc as T);
    return { ...transformed, id } as T;
  };

  private idOnlyQueryOptions = (options: IdQueryOptions<T>): QueryOptions<T> => {
    return {
      ...options,
      select: [], // the __name__ prop always comes back
    };
  };

  private async dataQueryResponse(query: Promise<QuerySnapshot>): Promise<QueryResponse<T>> {
    const querySnapshot = await query;
    return querySnapshot.docs.map((snapshot) => {
      const entity = this.createEntity(snapshot.ref.id, snapshot.data());
      return this.validateLoad(entity);
    });
  }

  private async applyMutation(
    entities: OneOrMany<T>,
    mutation: (loader: FirestoreLoader, entities: ReadonlyArray<FirestorePayload>) => Promise<any>
  ): Promise<OneOrMany<T>> {
    const transformedEntities = mapOneOrMany(entities, (entity) => transformDeep(entity, this.valueTransformers.write));
    const entitiesToSave = castArray(transformedEntities)
      .map(this.validateSave)
      .map(
        (data: T) =>
          ({
            ref: this.documentRef(data.id),
            data,
          } as FirestorePayload)
      );

    await mutation(this.getLoader(), entitiesToSave);
    if (this.searchOptions) {
      await this.indexForSearch(entities);
    }

    return mapOneOrMany(transformedEntities, (e) => this.afterRead(e));
  }

  private validateLoad = (entity: T) => this.validateEntity(entity, "load");

  private validateSave = (entity: T) => this.validateEntity(entity, "save");

  private validateEntity = (entity: T, operation: "load" | "save"): T => {
    if (!this.validator) {
      return entity;
    }

    try {
      return this.validator(entity);
    } catch (e) {
      throw new RepositoryError(operation, this.collectionPath, entity.id, [(e as Error).message]);
    }
  };

  protected prepareSearchEntry(entity: T): IndexEntry {
    assert.ok(this.searchOptions, SEARCH_NOT_ENABLED_MSG);
    return prepareIndexEntry(this.searchOptions.indexConfig, entity, (e) => e.id);
  }

  protected prepareSearchEntries(entities: OneOrMany<T>): IndexEntry[] {
    assert.ok(this.searchOptions, SEARCH_NOT_ENABLED_MSG);
    return castArray(entities).map((entity) => this.prepareSearchEntry(entity));
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

  private getFirestore = (): Firestore => {
    return this.firestore ?? firestoreProvider.get();
  };

  private getLoader = (): FirestoreLoader => {
    const loader = firestoreLoaderRequestStorage.get();
    return loader ?? new FirestoreLoader(this.getFirestore());
  };

  private getSearchService = (): SearchService => {
    return this.searchOptions?.searchService ?? searchProvider.get();
  };
}

const mapOneOrMany = <T, R>(src: OneOrMany<T>, mapFn: (single: T) => R): OneOrMany<R> =>
  isReadonlyArray(src) ? src.map(mapFn) : mapFn(src);
