import { Datastore, Key } from "@google-cloud/datastore";
import { isReadonlyArray, OneOrMany } from "@mondomob/gae-js-core";
import assert from "assert";
import { castArray, omit } from "lodash";
import { AbstractRepository, AbstractRepositoryOptions, buildExclusions } from "./abstract-repository";
import { DatastoreEntity, DatastorePayload, Index } from "./datastore-loader";

export interface StringIdEntity {
  id: string;
}
export interface NumberIdEntity {
  id?: number | null;
}
export type IdEntity = StringIdEntity | NumberIdEntity;
export type IdType = string | number;

export interface RepositoryOptions<T extends IdEntity> extends AbstractRepositoryOptions<T> {
  defaultValues?: Partial<Omit<T, "id">>;
  index?: Index<Omit<T, "id">>;
}

export class DatastoreRepository<T extends IdEntity> extends AbstractRepository<T> {
  constructor(protected readonly kind: string, protected readonly options: RepositoryOptions<T> = {}) {
    super(kind, options);
  }

  public idToKey(id: IdType | null | undefined): Key {
    return id ? this.getDatastore().key([this.kind, id]) : this.getDatastore().key([this.kind]);
  }

  public entityToKey(entity: T): Key {
    return this.idToKey(entity.id);
  }

  protected entityToStringId(entity: T): string {
    return `${entity.id}`;
  }

  protected keyToStringId(key: Key): string {
    const stringId = key.name || key.id;
    assert.ok(stringId, "key must have name or id");
    return stringId;
  }

  protected stringIdToKey(searchId: string): Key {
    return this.idToKey(searchId);
  }

  async getRequired(id: IdType): Promise<T>;
  async getRequired(ids: ReadonlyArray<IdType>): Promise<T[]>;
  async getRequired(ids: IdType | ReadonlyArray<IdType>): Promise<OneOrMany<T>> {
    return isReadonlyArray(ids)
      ? this.getRequiredByKey(ids.map((id) => this.idToKey(id)))
      : this.getRequiredByKey(this.idToKey(ids));
  }

  async exists(id: IdType): Promise<boolean> {
    return super.existsByKey(this.idToKey(id));
  }

  async get(id: IdType): Promise<T | null>;
  async get(ids: ReadonlyArray<IdType>): Promise<ReadonlyArray<T | null>>;
  async get(ids: IdType | ReadonlyArray<IdType>): Promise<OneOrMany<T | null>> {
    return isReadonlyArray(ids) ? this.getByKey(ids.map((id) => this.idToKey(id))) : this.getByKey(this.idToKey(ids));
  }

  async delete(...ids: IdType[]): Promise<void> {
    const keys = castArray(ids).map((id) => this.idToKey(id));
    return super.deleteByKey(...keys);
  }

  protected createEntity(datastoreEntity: DatastoreEntity): T {
    const key = datastoreEntity[Datastore.KEY];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const id = key.name || parseInt(key.id!);
    const data = omit(datastoreEntity, Datastore.KEY);
    return { ...(this.options.defaultValues as any), ...data, id };
  }

  protected entityToPayload(entity: T): DatastorePayload {
    const withoutId = omit(entity, "id");
    return {
      key: this.entityToKey(entity),
      data: withoutId,
      excludeFromIndexes: buildExclusions(withoutId, this.options.index),
    };
  }
}
