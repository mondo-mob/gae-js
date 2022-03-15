import {
  isReadonlyArray,
  BaseEntity,
  createLogger,
  getRequestStorageValueOrDefault,
  OneOrMany,
} from "@mondomob/gae-js-core";
import { FirestoreRepository } from "./firestore-repository";

export interface TimestampedEntity extends BaseEntity {
  createdAt: string;
  updatedAt: string;
}

const GENERATE_FLAG = "GENERATE";

export const newTimestampedEntity = (id: string): TimestampedEntity => {
  return {
    id,
    createdAt: GENERATE_FLAG,
    updatedAt: GENERATE_FLAG,
  };
};

/**
 * If you want to disable the auto-timestamp update (e.g. for db migrations)
 * then set this flag in RequestStorage to true.
 */
export const DISABLE_TIMESTAMP_UPDATE = "skipTimestampUpdate";

const logger = createLogger("timestampedRepository");

export class TimestampedRepository<T extends TimestampedEntity> extends FirestoreRepository<T> {
  protected beforePersist(entities: OneOrMany<T>): OneOrMany<T> {
    const updated = isReadonlyArray(entities)
      ? entities.map((e) => this.updateTimestamps(e))
      : this.updateTimestamps(entities);
    return super.beforePersist(updated);
  }

  private updateTimestamps(entity: T) {
    if (getRequestStorageValueOrDefault(DISABLE_TIMESTAMP_UPDATE, false)) {
      logger.debug("Timestamp update disabled by request storage flag");
      return entity;
    }

    const updateTime = new Date().toISOString();
    if (!entity.createdAt || entity.createdAt === GENERATE_FLAG) entity.createdAt = updateTime;
    entity.updatedAt = updateTime;
    return entity;
  }
}
