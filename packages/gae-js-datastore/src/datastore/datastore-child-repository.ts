import { Datastore, Key } from "@google-cloud/datastore";
import { AbstractRepository, buildExclusions } from "./abstract-repository";
import { DatastoreEntity, DatastorePayload } from "./datastore-loader";
import { omit } from "lodash";
import { entity as Entity } from "@google-cloud/datastore/build/src/entity";
import { IdEntity, IdType, RepositoryOptions } from "./datastore-repository";

export interface ChildRepositoryOptions<T extends IdEntity> extends RepositoryOptions<T> {
  parentProperty: keyof T;
}

export class DatastoreChildRepository<T extends IdEntity> extends AbstractRepository<T> {
  constructor(protected readonly kind: string, protected readonly options: ChildRepositoryOptions<T>) {
    super(kind, options);
  }

  public idToKey(parent: Key, id: IdType | null | undefined): Key {
    const path = id ? [this.kind, id] : [this.kind];
    return this.getDatastore().key(parent ? parent.path.concat(path) : path);
  }

  public entityToKey(entity: T): Entity.Key {
    const parent = this.getParentKey(entity);
    const path = entity.id ? [this.kind, entity.id] : [this.kind];
    return this.getDatastore().key(parent ? parent.path.concat(path) : path);
  }

  async getRequired(parent: Key, id: IdType): Promise<T> {
    return this.getRequiredByKey(this.idToKey(parent, id));
  }

  async exists(parent: Key, id: IdType): Promise<boolean> {
    return super.existsByKey(this.idToKey(parent, id));
  }

  async get(parent: Key, id: IdType): Promise<T | null> {
    return this.getByKey(this.idToKey(parent, id));
  }

  protected createEntity(datastoreEntity: DatastoreEntity): T {
    const key = datastoreEntity[Datastore.KEY];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const id = key.name || parseInt(key.id!);
    const parent = this.options.parentProperty ? { [this.options.parentProperty]: key.parent } : undefined;
    const data = omit(datastoreEntity, Datastore.KEY);
    return { ...(this.options.defaultValues as any), ...data, ...parent, id };
  }

  protected entityToPayload(entity: T): DatastorePayload {
    const idProps = this.options.parentProperty ? ["id", this.options.parentProperty] : "id";
    const withoutId = omit(entity, "id", idProps);
    return {
      key: this.entityToKey(entity),
      data: withoutId,
      excludeFromIndexes: buildExclusions(entity, this.options.index),
    };
  }

  private getParentKey(entity: T): Key | null {
    if (this.options.parentProperty) {
      const parentKey = entity[this.options.parentProperty];
      if (Entity.isDsKey(parentKey)) {
        return parentKey;
      }
      throw new Error(`parent property ${String(this.options.parentProperty)} must be of type Key`);
    }
    return null;
  }
}
