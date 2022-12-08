import DataLoader from "dataloader";
import { castArray, chunk, cloneDeep } from "lodash";
import {
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Query,
  QuerySnapshot,
  Transaction,
  WriteBatch,
} from "@google-cloud/firestore";
import { QueryOptions } from "./firestore-query";

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

  public async get(ids: DocumentReference[]): Promise<Array<DocumentData | null>> {
    const results = await this.loader.loadMany(ids);
    const firstError = results.find((r): r is Error => r instanceof Error);
    if (firstError) {
      throw firstError;
    }
    // Clone results to prevent polluting the cache if the caller mutates the returned document(s)
    return results?.map(cloneDocument);
  }

  public async create(entities: ReadonlyArray<FirestorePayload>): Promise<void> {
    await this.applyOperation(
      entities,
      (transaction, entity) => transaction.create(entity.ref, entity.data),
      (batch, entity) => batch.create(entity.ref, entity.data),
      (loader, { ref, data }) => setCacheFromData(loader, ref, data)
    );
  }

  public async set(entities: ReadonlyArray<FirestorePayload>): Promise<void> {
    await this.applyOperation(
      entities,
      (transaction, entity) => transaction.set(entity.ref, entity.data),
      (batch, entity) => batch.set(entity.ref, entity.data),
      (loader, { ref, data }) => setCacheFromData(loader, ref, data)
    );
  }

  public async delete(refs: ReadonlyArray<DocumentReference>): Promise<void> {
    await this.applyOperation(
      refs,
      (transaction, ref) => transaction.delete(ref),
      (batch, ref) => batch.delete(ref),
      (loader, key) => loader.clear(key)
    );
  }

  public async executeQuery<T>(collectionPath: string, options: Partial<QueryOptions<T>>): Promise<QuerySnapshot> {
    let query = this.firestore.collection(collectionPath) as Query;

    if (options.select) {
      query = query.select(...options.select);
    }

    if (options.filters) {
      options.filters.forEach((filter) => (query = query.where(filter.fieldPath, filter.opStr, filter.value)));
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

    const querySnapshot = this.transaction ? await this.transaction.get(query) : await query.get();
    if (!options.select) {
      // Update cache only when query does not select specific fields
      querySnapshot.forEach((result) => setCacheFromSnapshot(this.loader, result));
    }
    return querySnapshot;
  }

  public async inTransaction<T>(updateFunction: (loader: FirestoreLoader) => Promise<T>): Promise<T> {
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
