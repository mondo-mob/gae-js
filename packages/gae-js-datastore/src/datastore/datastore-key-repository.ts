import { Datastore } from "@google-cloud/datastore";
import { entity as Entity } from "@google-cloud/datastore/build/src/entity";
import { AbstractRepository, BaseEntity, buildExclusions, RepositoryOptions } from "./abstract-repository";
import { DatastoreEntity, DatastorePayload } from "./datastore-loader";
import { omit } from "lodash";

interface KeyRepositoryOptions<T extends BaseEntity> extends RepositoryOptions<T> {
  parentProperty?: keyof T;
}

export class DatastoreKeyRepository<T extends BaseEntity> extends AbstractRepository<T, Entity.Key> {
  constructor(protected readonly kind: string, protected readonly options: KeyRepositoryOptions<T>) {
    super(kind, options);
  }

  private getParentKey(entity: T): Entity.Key | null {
    if (this.options.parentProperty) {
      const parentKey = entity[this.options.parentProperty];
      if (Entity.isDsKey(parentKey)) {
        return parentKey;
      }
      throw new Error(`parent property ${String(this.options.parentProperty)} must be of type Entity.Key`);
    }
    return null;
  }

  public idToKey(id: Entity.Key): Entity.Key {
    return id;
  }

  public entityToKey(entity: T): Entity.Key {
    const parent = this.getParentKey(entity);
    const path = [this.kind, entity.id];
    return this.getDatastore().key(parent ? parent.path.concat(path) : path);
  }

  protected idToSearchId(id: Entity.Key): string {
    return JSON.stringify(id.serialized);
  }

  protected searchIdToId(searchId: string): Entity.Key {
    return this.getDatastore().key(JSON.parse(searchId));
  }

  protected entityToSearchId(entity: T): string {
    return this.idToSearchId(this.entityToKey(entity));
  }

  protected createEntity(datastoreEntity: DatastoreEntity): T {
    const key = datastoreEntity[Datastore.KEY];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const id = key.name!;
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
}
