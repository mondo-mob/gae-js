import { Firestore } from "@google-cloud/firestore";
import { DataValidator } from "@mondomob/gae-js-core";
import { firestoreProvider } from "./firestore-provider";
import { RepositoryError } from "./repository-error";
import { DateTransformers, transformDeep } from "./value-transformers";
import { BaseEntity, ValueTransformers } from "./types";
import { FirestoreLoader } from "./firestore-loader";
import { firestoreLoaderRequestStorage } from "./firestore-request-storage";

export interface BaseRepositoryOptions<T extends BaseEntity> {
  firestore?: Firestore;
  validator?: DataValidator<T>;
  valueTransformers?: ValueTransformers<T>;
}

export abstract class FirestoreBaseRepository<T extends BaseEntity> {
  protected readonly validator?: DataValidator<T>;
  protected readonly firestore?: Firestore;
  protected readonly valueTransformers: ValueTransformers<T>;

  protected constructor(
    private readonly name: string,
    {
      validator,
      firestore,
      valueTransformers = {
        write: [DateTransformers.write()],
        read: [DateTransformers.read()],
      },
    }: BaseRepositoryOptions<T> = {}
  ) {
    this.validator = validator;
    this.firestore = firestore;
    this.valueTransformers = valueTransformers;
  }

  createEntity = (id: string, doc: Record<string, unknown>): T => {
    const transformed: T = this.afterRead(doc as T);
    return { ...transformed, id } as T;
  };

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

  protected validateLoad = (entity: T) => this.validateEntity(entity, "load");

  protected validateEntity = (entity: T, operation: "load" | "save"): T => {
    if (!this.validator) {
      return entity;
    }

    try {
      return this.validator(entity);
    } catch (e) {
      throw new RepositoryError(operation, this.name, entity.id, [(e as Error).message]);
    }
  };

  protected getFirestore = (): Firestore => {
    return this.firestore ?? firestoreProvider.get();
  };

  protected getLoader = (): FirestoreLoader => {
    const loader = firestoreLoaderRequestStorage.get();
    return loader ?? new FirestoreLoader(this.getFirestore());
  };
}
