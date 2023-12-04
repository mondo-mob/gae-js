import { Datastore, Transaction } from "@google-cloud/datastore";
import { entity as Entity } from "@google-cloud/datastore/build/src/entity";
import { OrderOptions, RunQueryInfo } from "@google-cloud/datastore/build/src/query";
import DataLoader from "dataloader";
import { buildFilters, Filters } from "./filters";
import { createLogger, Logger, NonFatalError, OneOrMany } from "@mondomob/gae-js-core";
import { castArray, chunk, isEqual } from "lodash";

const keysEqual = (key1: Entity.Key, key2: Entity.Key) => {
  return isEqual(key1.path.join(":"), key2.path.join(":"));
};

export type Index<T> =
  | true
  | {
      [K in keyof T]?: NonNullable<Required<T>[K]> extends Array<any>
        ? Index<NonNullable<Required<T>[K]>[0]>
        : Index<T[K]>;
    };

export interface PropertySort {
  property: string;
  options?: OrderOptions;
}

export interface QueryOptions<T> {
  select: OneOrMany<(keyof T | "__key__") & string>;
  filters: Filters<T>;
  sort: OneOrMany<PropertySort>;
  groupBy: OneOrMany<keyof T & string>;
  start: string;
  end: string;
  hasAncestor: Entity.Key;
  offset: number;
  limit: number;
}

export type QueryResponse<T> = [ReadonlyArray<T>, RunQueryInfo];

export type DocumentData = { [field: string]: any };

export interface DatastorePayload {
  key: Entity.Key;
  data: DocumentData;
  excludeFromIndexes?: string[];
}

export type DatastoreEntity = DocumentData & {
  [Datastore.KEY]: Entity.Key;
};

function isTransaction(datastore: Datastore | Transaction): datastore is Transaction {
  return (datastore as any).commit !== undefined;
}

export class DatastoreLoader {
  private readonly loader: DataLoader<Entity.Key, DatastoreEntity | null>;
  private readonly datastore: Datastore | Transaction;
  private readonly logger: Logger;

  constructor(datastore: Datastore | Transaction) {
    this.datastore = datastore;
    this.loader = new DataLoader(this.load, {
      cacheKeyFn: (key: Entity.Key) => key.path.join(":"),
    });
    this.logger = createLogger("datastore-loader");
  }

  public async get(ids: Entity.Key[]): Promise<Array<DatastoreEntity | null>> {
    const results = await this.loader.loadMany(ids);
    const { values, errors } = results.reduce(
      (acc, entry) => {
        if (entry instanceof Error) {
          acc.errors.push(entry);
        } else {
          acc.values.push(entry);
        }
        return acc;
      },
      { errors: [] as Array<Error>, values: [] as Array<DatastoreEntity | null> }
    );
    if (errors.length) {
      throw errors[0];
    }
    return values;
  }

  /**
   * Persist a set of entities in datastore
   *
   * This method will automatically batch them in groups of 100
   *
   * @param entities The entities to persist
   */
  public async save(entities: ReadonlyArray<DatastorePayload>): Promise<void> {
    await this.applyBatched(
      entities,
      (datastore, chunk) => datastore.save(chunk),
      (loader, { key, data }) => DatastoreLoader.resetDataloaderCache(loader, key, data)
    );
  }

  public async delete(entities: ReadonlyArray<Entity.Key>): Promise<void> {
    await this.applyBatched(
      entities,
      (datastore, chunk) => datastore.delete(chunk) as Promise<any>,
      (loader, key) => loader.clear(key)
    );
  }

  public async update(entities: ReadonlyArray<DatastorePayload>): Promise<void> {
    await this.applyBatched(
      entities,
      (datastore, chunk) => datastore.update(chunk),
      (loader, { key, data }) => DatastoreLoader.resetDataloaderCache(loader, key, data)
    );
  }

  public async upsert(entities: ReadonlyArray<DatastorePayload>): Promise<void> {
    await this.applyBatched(
      entities,
      (datastore, chunk) => datastore.upsert(chunk),
      (loader, { key, data }) => DatastoreLoader.resetDataloaderCache(loader, key, data)
    );
  }

  public async insert(entities: ReadonlyArray<DatastorePayload>): Promise<void> {
    await this.applyBatched(
      entities,
      (datastore, chunk) => datastore.insert(chunk),
      (loader, { key, data }) => DatastoreLoader.resetDataloaderCache(loader, key, data)
    );
  }

  public async executeQuery<T>(
    kind: string | null,
    options: Partial<QueryOptions<T>>
  ): Promise<[DatastoreEntity[], RunQueryInfo]> {
    let query = this.datastore.createQuery(kind ? kind : undefined);

    if (options.select) {
      query = query.select(castArray(options.select));
    }

    if (options.filters) {
      query = buildFilters(query, options.filters);
    }

    if (options.sort) {
      castArray(options.sort).forEach((sort) => query.order(sort.property, sort.options));
    }

    if (options.groupBy) {
      query.groupBy(castArray(options.groupBy));
    }

    if (options.start) {
      query.start(options.start);
    }

    if (options.end) {
      query.end(options.end);
    }

    if (options.hasAncestor) {
      query.hasAncestor(options.hasAncestor);
    }

    if (options.limit) {
      query.limit(options.limit);
    }

    if (options.offset) {
      query.offset(options.offset);
    }

    const [results, queryInfo] = await query.run();

    if (!options.select) {
      // Update cache only when query does not select specific fields
      results.forEach((result: any) => {
        this.loader.clear(result[Datastore.KEY]).prime(result[Datastore.KEY], result);
      });
    }

    return [results as DatastoreEntity[], queryInfo];
  }

  public isTransaction(): boolean {
    return isTransaction(this.datastore);
  }

  public async inTransaction<T>(callback: (loader: DatastoreLoader) => Promise<T>): Promise<T> {
    if (isTransaction(this.datastore)) {
      return callback(this);
    } else {
      const transaction = this.datastore.transaction();
      await transaction.run();

      const result = await this.runCallbackInTransaction(callback, transaction);

      try {
        await transaction.commit();
      } catch (ex) {
        this.logger.error("Error committing transaction", ex);
        throw ex;
      }

      // Any entities saved in this transaction need to be cleared from the parent cache
      // now we have committed this transaction. Given it is only a request scope cache
      // it's simple enough to clear the lot.
      this.loader.clearAll();

      return result;
    }
  }

  private async runCallbackInTransaction<T>(
    callback: (loader: DatastoreLoader) => Promise<T>,
    transaction: Transaction
  ): Promise<T> {
    try {
      return await callback(new DatastoreLoader(transaction));
    } catch (ex) {
      if (ex instanceof NonFatalError) {
        this.logger.warn("Rolling back transaction - non-fatal error encountered", ex);
      } else {
        this.logger.error("Rolling back transaction - error encountered", ex);
      }
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        this.logger.error("Error encountered rolling back transaction", rollbackError);
      }
      throw ex;
    }
  }

  private static resetDataloaderCache(
    loader: DataLoader<Entity.Key, DatastoreEntity | null>,
    key: Entity.Key,
    data: DocumentData | null
  ) {
    const datastoreEntity = { [Datastore.KEY]: key, ...data };
    return loader.clear(key).prime(key, datastoreEntity);
  }

  private async applyBatched<T>(
    values: ReadonlyArray<T>,
    operation: (datastore: Datastore | Transaction, chunk: ReadonlyArray<T>) => Promise<any> | void,
    updateLoader: (loader: DataLoader<Entity.Key, DatastoreEntity | null>, value: T) => void,
    batchSize = 100
  ) {
    const entityChunks: T[][] = chunk(values, batchSize);
    const pendingModifications = entityChunks.map((entityChunk: T[]) => operation(this.datastore, entityChunk));
    await Promise.all(pendingModifications);

    values.forEach((value) => updateLoader(this.loader, value));
  }

  private load = async (keys: ReadonlyArray<Entity.Key>): Promise<Array<DatastoreEntity | null | Error>> => {
    const [results] = await this.datastore.get([...keys]);
    return keys.map((key) => {
      const result = results.find((result: any) => keysEqual(result[Datastore.KEY], key));
      return result || null;
    });
  };
}
