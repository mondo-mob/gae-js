import * as t from "io-ts";
import reporter from "io-ts-reporters";
import * as _ from "lodash";
import { Firestore, DocumentReference } from "@google-cloud/firestore";
import { FirestoreLoader, FirestorePayload } from "./firestore-loader";
import { firestoreClientRequestStorage, firestoreLoaderRequestStorage } from "./firestore-request-storage";
import { isLeft } from "fp-ts/lib/Either";
import { QueryOptions } from "./firestore-query";
import { asArray, OneOrMany } from "@dotrun/gae-js-core";

export interface RepositoryOptions<T> {
  firestore?: Firestore;
  validator?: t.Type<T>;
}

export class FirestoreRepository<T extends { id: string }> {
  private readonly validator?: t.Type<T>;
  private readonly firestore?: Firestore;

  constructor(protected readonly collectionPath: string, options?: RepositoryOptions<T>) {
    this.validator = options?.validator;
    this.firestore = options?.firestore;
  }

  async getRequired(id: string): Promise<T> {
    const result = await this.get(id);
    if (!result) {
      throw new RepositoryError("load", this.collectionPath, id, ["invalid id"]);
    }
    return result;
  }

  async get(id: string): Promise<T | null>;
  async get(ids: ReadonlyArray<string>): Promise<ReadonlyArray<T>>;
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

  async query(options: Partial<QueryOptions<T>> = {}): Promise<ReadonlyArray<T>> {
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

  // async update(context: Context, entities: T): Promise<T>;
  // async update(context: Context, entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  // async update(context: Context, entities: OneOrMany<T>): Promise<OneOrMany<T>> {
  //   return this.applyMutation(context, this.beforePersist(context, entities), (loader, e) => loader.update(e));
  // }
  //
  // async insert(context: Context, entities: T): Promise<T>;
  // async insert(context: Context, entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  // async insert(context: Context, entities: OneOrMany<T>): Promise<OneOrMany<T>> {
  //   return this.applyMutation(context, this.beforePersist(context, entities), (loader, e) => loader.insert(e));
  // }
  //
  // async upsert(context: Context, entities: T): Promise<T>;
  // async upsert(context: Context, entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  // async upsert(context: Context, entities: OneOrMany<T>): Promise<OneOrMany<T>> {
  //   return this.applyMutation(context, this.beforePersist(context, entities), (loader, e) => loader.upsert(e));
  // }

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
  }

  documentRef = (name: string): DocumentReference => {
    return this.getFirestore().doc(`${this.collectionPath}/${name}`);
  };

  private createEntity = (id: string, value: Record<string, unknown>): T => {
    return { ...value, id } as T;
  };

  private async applyMutation(
    entities: OneOrMany<T>,
    mutation: (loader: FirestoreLoader, entities: ReadonlyArray<FirestorePayload<T>>) => Promise<any>
  ): Promise<OneOrMany<T>> {
    const entitiesToSave = asArray(entities)
      .map(this.validateSave)
      .map((data: T) => {
        const withoutId = _.omit(data, "id");
        return {
          ref: this.documentRef(data.id),
          data: withoutId,
        } as FirestorePayload<T>;
      });

    await mutation(this.getLoader(), entitiesToSave);

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

  private getFirestore = (): Firestore => {
    return this.firestore ?? firestoreClientRequestStorage.getRequired();
  };

  private getLoader = (): FirestoreLoader => {
    const loader = firestoreLoaderRequestStorage.get();
    return loader ?? new FirestoreLoader(this.getFirestore());
  };
}
