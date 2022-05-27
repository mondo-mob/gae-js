import { Firestore, DocumentReference } from "@google-cloud/firestore";
import { FirestoreLoader, FirestorePayload } from "./firestore-loader";
import { firestoreLoaderRequestStorage } from "./firestore-request-storage";
import { QueryOptions, QueryResponse } from "./firestore-query";
import {
  asArray,
  iots as t,
  iotsReporter as reporter,
  isLeft,
  OneOrMany,
  SearchFields,
  Sort,
  Page,
  SearchResults,
  SearchService,
  searchProvider,
  IndexEntry,
  prepareIndexEntry,
  IndexConfig,
  createLogger,
} from "@mondomob/gae-js-core";
import { first } from "lodash";
import { RepositoryError } from "./repository-error";
import { firestoreProvider } from "./firestore-provider";
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
  firestore?: Firestore;
  validator?: t.Type<T>;
  search?: RepositorySearchOptions<T>;
}

export class FirestoreRepository<T extends BaseEntity> {
  private readonly logger = createLogger("firestore-repository");
  private readonly validator?: t.Type<T>;
  private readonly firestore?: Firestore;
  protected readonly searchOptions?: RepositorySearchOptions<T>;

  constructor(protected readonly collectionPath: string, options?: RepositoryOptions<T>) {
    this.validator = options?.validator;
    this.firestore = options?.firestore;
    this.searchOptions = options?.search;
  }

  async getRequired(id: string): Promise<T>;
  async getRequired(ids: ReadonlyArray<string>): Promise<T[]>;
  async getRequired(ids: string | ReadonlyArray<string>): Promise<OneOrMany<T>> {
    const isArrayParam = Array.isArray(ids);
    const idsArray = isArrayParam ? ids : [ids];
    const results = await this.get(idsArray);
    const nullIndex = results.indexOf(null);
    if (nullIndex >= 0) {
      throw new RepositoryError("load", this.collectionPath, idsArray[nullIndex], ["invalid id"]);
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
    const idArray = asArray(ids);
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

  async query(options: Partial<QueryOptions<T>> = {}): Promise<QueryResponse<T>> {
    const querySnapshot = await this.getLoader().executeQuery<T>(this.collectionPath, options);

    return querySnapshot.docs.map((snapshot) => {
      const entity = this.createEntity(snapshot.ref.id, snapshot.data());
      return this.validateLoad(entity);
    });
  }

  async save(entities: T): Promise<T>;
  async save(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async save(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.applyMutation(this.beforePersist(entities), (loader, e) => loader.set(e));
  }

  async insert(entities: T): Promise<T>;
  async insert(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async insert(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.applyMutation(this.beforePersist(entities), (loader, e) => loader.create(e));
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

  async delete(...ids: string[]): Promise<void> {
    const allIds = ids.map((id) => this.documentRef(id));
    await this.getLoader().delete(allIds);
    if (this.searchOptions) {
      await this.getSearchService().delete(this.searchOptions.indexName, ...ids);
    }
  }

  async deleteAll(): Promise<void> {
    const collectionRef = this.getFirestore().collection(this.collectionPath);
    await this.getFirestore().recursiveDelete(collectionRef);
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

  documentRef = (name: string): DocumentReference => {
    return this.getFirestore().doc(`${this.collectionPath}/${name}`);
  };

  private createEntity = (id: string, value: Record<string, unknown>): T => {
    return { ...value, id } as T;
  };

  private async applyMutation(
    entities: OneOrMany<T>,
    mutation: (loader: FirestoreLoader, entities: ReadonlyArray<FirestorePayload>) => Promise<any>
  ): Promise<OneOrMany<T>> {
    const entitiesToSave = asArray(entities)
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
    return entities;
  }

  private validateLoad = (entity: T) => this.validateEntity(entity, "load");

  private validateSave = (entity: T) => this.validateEntity(entity, "save");

  private validateEntity = (entity: T, operation: "load" | "save"): T => {
    if (!this.validator) {
      return entity;
    }

    const validation = this.validator.decode(entity);

    if (isLeft(validation)) {
      const errors = reporter.report(validation);
      throw new RepositoryError(operation, this.collectionPath, entity.id, errors);
    }

    return validation.right;
  };

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
