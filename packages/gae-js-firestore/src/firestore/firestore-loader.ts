import DataLoader from "dataloader";
import { castArray, chunk, cloneDeep } from "lodash";
import {
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Filter,
  Firestore,
  Precondition,
  Query,
  QuerySnapshot,
  Transaction,
  WriteBatch,
} from "@google-cloud/firestore";
import { FilterOptions, QueryOptions } from "./firestore-query";
import { FirestoreRepositoryError } from "./repository-error";

export interface FirestorePayload {
  ref: DocumentReference;
  data: DocumentData;
}

const cloneDocument = (data: DocumentData | null) => cloneDeep(data);

/**
 * Updates loader cache value with given data.
 * This includes deep cloning the data to prevent possible pollution of the cache by
 * updating the original copy of the document.
 */
const setCacheFromData = (
  loader: DataLoader<DocumentReference, DocumentData | null>,
  ref: DocumentReference,
  data: DocumentData | null
) => {
  loader.clear(ref).prime(ref, cloneDocument(data));
};

/**
 * Updates loader cache value with given document snapshot
 * This does not require cloning because the snapshot.data() call does this for us.
 */
const setCacheFromSnapshot = (
  loader: DataLoader<DocumentReference, DocumentData | null>,
  snapshot: DocumentSnapshot
) => {
  loader.clear(snapshot.ref).prime(snapshot.ref, snapshot.data() || null);
};

export class FirestoreLoader {
  private readonly loader: DataLoader<DocumentReference, DocumentData | null>;
  private readonly firestore: Firestore;
  private readonly transaction: Transaction | null;

  constructor(firestore: Firestore, transaction?: Transaction) {
    this.firestore = firestore;
    this.transaction = transaction || null;
    this.loader = new DataLoader(this.load, {
      cacheKeyFn: (ref) => ref.path,
    });
  }

  async get(ids: DocumentReference[]): Promise<Array<DocumentData | null>> {
    const results = await this.loader.loadMany(ids);
    const firstError = results.find((r): r is Error => r instanceof Error);
    if (firstError) {
      throw firstError;
    }
    // Clone results to prevent polluting the cache if the caller mutates the returned document(s)
    return results?.map(cloneDocument);
  }

  async create(entities: ReadonlyArray<FirestorePayload>): Promise<void> {
    await this.applyOperation(
      entities,
      (transaction, entity) => transaction.create(entity.ref, entity.data),
      (batch, entity) => batch.create(entity.ref, entity.data),
      (loader, { ref, data }) => setCacheFromData(loader, ref, data)
    );
  }

  async set(entities: ReadonlyArray<FirestorePayload>): Promise<void> {
    await this.applyOperation(
      entities,
      (transaction, entity) => transaction.set(entity.ref, entity.data),
      (batch, entity) => batch.set(entity.ref, entity.data),
      (loader, { ref, data }) => setCacheFromData(loader, ref, data)
    );
  }

  async delete(refs: ReadonlyArray<DocumentReference>, precondition?: Precondition): Promise<void> {
    await this.applyOperation(
      refs,
      (transaction, ref) => transaction.delete(ref, precondition),
      (batch, ref) => batch.delete(ref, precondition),
      (loader, key) => loader.clear(key)
    );
  }

  async deleteAll(collectionPath: string, { ignoreTransaction = false }: DeleteAllOptions = {}): Promise<void> {
    if (this.transaction && !ignoreTransaction) {
      throw new FirestoreRepositoryError(
        "deleteAll.transaction.repository.error",
        "deleteAll is not supported from within a transaction"
      );
    }
    this.loader.clearAll();
    await this.firestore.recursiveDelete(this.firestore.collection(collectionPath));
  }

  async execCount(collectionPath: string, options: FilterOptions): Promise<number> {
    const query = this.applyQueryOptions(this.firestore.collection(collectionPath), options);
    return this.runCountQuery(query);
  }

  async execGroupCount(collectionId: string, options: FilterOptions): Promise<number> {
    const query = this.applyQueryOptions(this.firestore.collectionGroup(collectionId), options);
    return this.runCountQuery(query);
  }

  async executeQuery<T>(collectionPath: string, options: QueryOptions<T>): Promise<QuerySnapshot> {
    const query = this.applyQueryOptions(this.firestore.collection(collectionPath), options);
    return this.runDataQuery(query, options);
  }

  async executeGroupQuery<T>(collectionId: string, options: QueryOptions<T>): Promise<QuerySnapshot> {
    const query = this.applyQueryOptions(this.firestore.collectionGroup(collectionId), options);
    return this.runDataQuery(query, options);
  }

  async inTransaction<T>(updateFunction: (loader: FirestoreLoader) => Promise<T>): Promise<T> {
    if (this.isTransaction()) {
      return updateFunction(this);
    } else {
      return this.firestore
        .runTransaction((transaction) => {
          const loader = new FirestoreLoader(this.firestore, transaction);
          return updateFunction(loader);
        })
        .then((result) => {
          // Maybe OTT to clear entire cache but seems safest to ensure all stale data is removed
          // i.e. not as simple as merging the transaction cache into this one as need to track deletes too
          this.loader.clearAll();
          return result;
        });
    }
  }

  public isTransaction(): boolean {
    return !!this.transaction;
  }

  private async runCountQuery(query: Query): Promise<number> {
    const countQuery = query.count();
    const querySnapshot = this.transaction ? await this.transaction.get(countQuery) : await countQuery.get();
    return querySnapshot.data().count;
  }

  private async runDataQuery<T>(query: Query, options: QueryOptions<T>): Promise<QuerySnapshot> {
    const querySnapshot = this.transaction ? await this.transaction.get(query) : await query.get();
    if (!options.select) {
      // Update cache only when query does not select specific fields
      querySnapshot.forEach((result) => setCacheFromSnapshot(this.loader, result));
    }
    return querySnapshot;
  }

  private applyQueryOptions<T>(baseQuery: Query, options: QueryOptions<T>): Query {
    let query = this.applyQueryFilters(baseQuery, options);

    if (options.select) {
      query = query.select(...options.select);
    }

    if (options.sort) {
      castArray(options.sort).forEach((sort) => (query = query.orderBy(sort.fieldPath, sort.direction)));
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.startAfter) query = query.startAfter(...options.startAfter);
    if (options.startAt) query = query.startAt(...options.startAt);
    if (options.endAt) query = query.endAt(...options.endAt);
    if (options.endBefore) query = query.endBefore(...options.endBefore);

    if (options.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  private applyQueryFilters(baseQuery: Query, { filters }: FilterOptions): Query {
    let query = baseQuery;
    if (filters) {
      if (filters instanceof Filter) {
        query = query.where(filters);
      } else {
        filters.forEach((filter) => (query = query.where(filter.fieldPath, filter.opStr, filter.value)));
      }
    }
    return query;
  }

  private async applyOperation<T>(
    values: ReadonlyArray<T>,
    batchOperation: (batch: WriteBatch, value: T) => void,
    transactionOperation: (txn: Transaction, value: T) => void,
    updateLoader: (loader: DataLoader<DocumentReference, DocumentData | null>, value: T) => void,
    batchSize = 100
  ) {
    if (this.transaction) {
      const txn = this.transaction;
      values.forEach((value) => transactionOperation(txn, value));
    } else {
      const entityChunks: T[][] = chunk(values, batchSize);
      const pendingModifications = entityChunks.map((entityChunk: T[]) => {
        const batch = this.firestore.batch();
        entityChunk.forEach((value) => batchOperation(batch, value));
        return batch.commit();
      });
      await Promise.all(pendingModifications);

      values.forEach((value) => updateLoader(this.loader, value));
    }
  }

  private load = async (refs: ReadonlyArray<DocumentReference>): Promise<Array<DocumentData | null | Error>> => {
    const snapshots = this.transaction ? await this.transaction.getAll(...refs) : await this.firestore.getAll(...refs);
    return refs.map((ref) => {
      const snapshot = snapshots.find((s) => s.ref.isEqual(ref));
      if (snapshot) {
        return snapshot.data() || null;
      }
      return new Error(`No snapshot for ref: ${ref.path}`);
    });
  };
}

export interface DeleteAllOptions {
  ignoreTransaction?: boolean;
}
