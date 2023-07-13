import { Bootstrapper, createLogger, runWithRequestStorage, setRequestStorageValue } from "@mondomob/gae-js-core";
import {
  DISABLE_TIMESTAMP_UPDATE,
  FirestoreLoader,
  firestoreLoaderRequestStorage,
  firestoreProvider,
  newTimestampedEntity,
} from "@mondomob/gae-js-firestore";
import { merge } from "lodash";
import { AutoMigration } from "./auto-migration";
import { migrationResultsRepository } from "./migration-results.repository";
import { mutexServiceProvider } from "./mutex";

const logger = createLogger("migrations");
const MUTEX_ID = "migrations";

const getMigrationsToRun = async (migrations: AutoMigration[]) => {
  const existingMigrationIds: string[] = (await migrationResultsRepository.get(migrations.map((m) => m.id)))
    .map((migration) => migration?.id)
    .filter((id) => !!id) as string[];
  return migrations.filter((migration) => {
    if (existingMigrationIds.includes(migration.id)) {
      return false;
    }

    if (migration.skip?.()) {
      logger.info(`Skipping migration: ${migration.id}`);
      return false;
    }
    return true;
  });
};

const runMigration = async ({ id: migrationId, migrate, options }: AutoMigration, defaultOptions: MigrationOptions) => {
  const { disableTimestampUpdate } = merge({}, defaultOptions, options);
  const createdAt = new Date();
  try {
    const migrationLogger = createLogger(migrationId);
    if (disableTimestampUpdate) {
      await runWithRequestStorage(async () => {
        logger.info(`Running migration with disabled timestamp update: ${migrationId}`);
        setRequestStorageValue(DISABLE_TIMESTAMP_UPDATE, true);
        return migrate({
          logger: migrationLogger,
        });
      });
    } else {
      logger.info(`Running migration: ${migrationId}`);
      await migrate({
        logger: migrationLogger,
      });
    }
    logger.info(`Migration completed: ${migrationId}`);
    await migrationResultsRepository.insert({ ...newTimestampedEntity(migrationId), result: "COMPLETE", createdAt });
  } catch (e) {
    logger.warn(e, `Error running migration: ${migrationId}`);
    await migrationResultsRepository.insert({
      ...newTimestampedEntity(migrationId),
      result: "ERROR",
      error: (e as Error).message || "Unknown",
      createdAt,
    });
  }
};

export const runMigrations = async (migrations: AutoMigration[], options: MigrationOptions = {}) => {
  if (migrations.length === 0) {
    logger.debug(`No migrations configured to run`);
    return;
  }

  await mutexServiceProvider.get().withMutexSilent(
    MUTEX_ID,
    async () => {
      const migrationsToRun = await getMigrationsToRun(migrations);

      logger.info(
        `${migrationsToRun.length} migrations to run, ${migrations.length - migrationsToRun.length} skipped.`
      );
      for (const migration of migrationsToRun) {
        await runMigration(migration, options);
      }
    },
    {
      onMutexUnavailable: () => logger.info(`Unable to obtain migration mutex '${MUTEX_ID}'. Skipping all migrations.`),
    }
  );
};

export const bootstrapMigrations =
  (migrations: AutoMigration[], options?: MigrationOptions): Bootstrapper =>
  async () => {
    await runWithRequestStorage(async () => {
      // We need firestore loader in request storage if we want to use gae-js transactions
      firestoreLoaderRequestStorage.set(new FirestoreLoader(firestoreProvider.get()));

      await runMigrations(migrations, options);
    });
  };

export interface MigrationOptions {
  /**
   * If set to true, then timestamps will not be automatically set via TimestampedRepository instances.
   */
  disableTimestampUpdate?: boolean;
}
