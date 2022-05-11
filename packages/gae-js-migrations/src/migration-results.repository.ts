import { TimestampedEntity, TimestampedRepository } from "@mondomob/gae-js-firestore";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MigrationResult extends TimestampedEntity {
  result: "COMPLETE" | "ERROR";
  error?: string;
}

export const migrationResultsRepository = new TimestampedRepository<MigrationResult>("migrations");
