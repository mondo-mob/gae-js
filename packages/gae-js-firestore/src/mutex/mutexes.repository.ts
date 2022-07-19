import { TimestampedEntity, TimestampedRepository } from "../firestore";

export const MUTEXES_COLLECTION_NAME = "mutexes";

export interface Mutex extends TimestampedEntity {
  locked: boolean;
  obtainedAt: string;
  expiredAt: string;
  releasedAt?: string;
}

export const mutexesRepository = new TimestampedRepository<Mutex>(MUTEXES_COLLECTION_NAME);
