import { createLogger, getRequestStorageValueOrDefault } from "@mondomob/gae-js-core";
import { BaseEntity, FirestoreRepository } from "./firestore-repository";

export interface TimestampedEntity extends BaseEntity {
  createdAt: Date;
  updatedAt: Date;
}

// A flag value we can identify and override on save - but one that is highly unlikely to conflict with a real date.
const GENERATE_FLAG = new Date(-8640000000000000);

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
  protected beforePersist(entity: T): T {
    return super.beforePersist(this.updateTimestamps(entity));
  }

  private updateTimestamps(entity: T) {
    const isTimestampUpdateDisabled = getRequestStorageValueOrDefault(DISABLE_TIMESTAMP_UPDATE, false);
    if (isTimestampUpdateDisabled) {
      logger.debug("Timestamp update disabled by request storage flag");
    }

    const updatedAt =
      isTimestampUpdateDisabled && isValidExistingDate(entity.updatedAt) ? entity.updatedAt : new Date();
    const { createdAt } = entity;
    return {
      ...entity,
      updatedAt,
      createdAt: isValidExistingDate(createdAt) ? createdAt : updatedAt,
    };
  }
}

const isValidExistingDate = (src?: Date) => !!src && src !== GENERATE_FLAG;
