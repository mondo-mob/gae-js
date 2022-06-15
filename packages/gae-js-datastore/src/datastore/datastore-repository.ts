import { Datastore } from "@google-cloud/datastore";
import { entity as Entity } from "@google-cloud/datastore/build/src/entity";
import { AbstractRepository, BaseEntity, buildExclusions, RepositoryOptions } from "./abstract-repository";
import { DatastoreEntity, DatastorePayload } from "./datastore-loader";
import { omit } from "lodash";

export class DatastoreRepository<T extends BaseEntity> extends AbstractRepository<T, string> {
  constructor(protected readonly kind: string, protected readonly options: RepositoryOptions<T>) {
    super(kind, options);
  }

  public idToKey(id: string): Entity.Key {
    return this.getDatastore().key([this.kind, id]);
  }

  public entityToKey(entity: T): Entity.Key {
    return this.getDatastore().key([this.kind, entity.id]);
  }

  protected idToSearchId(id: string): string {
    return id;
  }

  protected searchIdToId(searchId: string): string {
    return searchId;
  }

  protected entityToSearchId(entity: T): string {
    return entity.id;
  }

  protected createEntity(datastoreEntity: DatastoreEntity): T {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const id = datastoreEntity[Datastore.KEY].name!;
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
