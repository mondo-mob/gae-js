import * as t from "io-ts";
import reporter from "io-ts-reporters";
import * as _ from "lodash";
import { Firestore, DocumentReference } from "@google-cloud/firestore";
import { FirestoreLoader, FirestorePayload } from "./firestore-loader";
import { firestoreLoaderRequestStorage } from "./firestore-request-storage";
import { isLeft } from "fp-ts/lib/Either";
import { QueryOptions } from "./firestore-query";
import { asArray, BaseEntity, OneOrMany, Repository } from "@dotrun/gae-js-core";
import { RepositoryError } from "./repository-error";
import { firestoreProvider } from "./firestore-provider";

export interface RepositoryOptions<T> {
  firestore?: Firestore;
  validator?: t.Type<T>;
}

export class FirestoreRepository<T extends BaseEntity> implements Repository<T> {
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

  async update(entities: T): Promise<T>;
  async update(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async update(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.applyMutation(this.beforePersist(entities), (loader, e) => loader.update(e));
  }

  async insert(entities: T): Promise<T>;
  async insert(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async insert(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.applyMutation(this.beforePersist(entities), (loader, e) => loader.create(e));
  }

  async upsert(entities: T): Promise<T>;
  async upsert(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async upsert(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    throw new Error("Not implemented");
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
  }

  async deleteAll(): Promise<void> {
    // TODO: Implement it
    throw new Error("Not implemented");
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
      .map((data: T) => {
        const withoutId = _.omit(data, "id");
        return {
          ref: this.documentRef(data.id),
          data: withoutId,
        } as FirestorePayload;
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
    return this.firestore ?? firestoreProvider.get();
  };

  private getLoader = (): FirestoreLoader => {
    const loader = firestoreLoaderRequestStorage.get();
    return loader ?? new FirestoreLoader(this.getFirestore());
  };
}
