import DataLoader from "dataloader";
import _ from "lodash";
import {
  DocumentData,
  DocumentReference,
  Firestore,
  Query,
  QuerySnapshot,
  Transaction,
  WriteBatch,
} from "@google-cloud/firestore";
import { createLogger } from "@mlev/gae-js-core";
import { QueryOptions } from "./firestore-query";

export interface FirestorePayload<T> {
  ref: DocumentReference<T>;
  data: T;
}

export class FirestoreLoader {
  private readonly loader: DataLoader<DocumentReference, DocumentData | null>;
  private readonly firestore: Firestore;
  private readonly transaction: Transaction | null;
  private readonly logger = createLogger("firestore-loader");

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
    return results;
  }

  public async create(entities: ReadonlyArray<FirestorePayload<any>>): Promise<void> {
    await this.applyOperation(
      entities,
      (transaction, entity) => transaction.create(entity.ref, entity.data),
      (batch, entity) => batch.create(entity.ref, entity.data),
      (loader, { ref, data }) => loader.prime(ref, data)
    );
  }

  public async set<T>(entities: ReadonlyArray<FirestorePayload<T>>): Promise<void> {
    await this.applyOperation(
      entities,
      (transaction, entity) => transaction.set(entity.ref, entity.data),
      (batch, entity) => batch.set(entity.ref, entity.data),
      (loader, { ref, data }) => loader.prime(ref, data)
    );
  }

  public async update<T>(entities: ReadonlyArray<FirestorePayload<T>>): Promise<void> {
    await this.applyOperation(
      entities,
      (transaction, entity) => transaction.update(entity.ref, entity.data),
      (batch, entity) => batch.update(entity.ref, entity.data),
      (loader, { ref, data }) => loader.prime(ref, data)
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

    // TODO: Build other query options
    // select
    // sort
    if (options.filters) {
      options.filters.forEach((filter) => (query = query.where(filter.fieldPath, filter.opStr, filter.value)));
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    const querySnapshot = this.transaction ? await this.transaction.get(query) : await query.get();
    querySnapshot.forEach((result) => this.loader.prime(result.ref, result));
    return querySnapshot;
  }

  public async inTransaction<T>(updateFunction: (loader: FirestoreLoader) => Promise<T>): Promise<T> {
    if (this.isTransaction()) {
      return updateFunction(this);
    } else {
      return this.firestore.runTransaction((transaction) => {
        const loader = new FirestoreLoader(this.firestore, transaction);
        return updateFunction(loader);
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
      const entityChunks: T[][] = _.chunk(values, batchSize);
      const pendingModifications = entityChunks.map((chunk: T[]) => {
        const batch = this.firestore.batch();
        chunk.forEach((value) => batchOperation(batch, value));
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
