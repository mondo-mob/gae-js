import { createLogger, runWithRequestStorage, Bootstrapper } from "@mondomob/gae-js-core";
import { migrationResultsRepository } from "./migration-results.repository";
import {
  FirestoreLoader,
  firestoreLoaderRequestStorage,
  firestoreProvider,
  newTimestampedEntity,
} from "@mondomob/gae-js-firestore";
import { mutexServiceProvider } from "./mutex.service";
import { MutexUnavailableError } from "./mutex-unavailable-error";
import { AutoMigration, MigrationConfig } from "./auto-migration";

const logger = createLogger("migration-bootstrapper");
const MUTEX_ID = "migration-bootstrapper";
const MUTEX_EXPIRY_SECONDS = 5 * 60;

const getMigrationsToRun = async (migrations: AutoMigration[], config: MigrationConfig) => {
  const migrationResults = await migrationResultsRepository.get(migrations.map((m) => m.id));
  return migrations.filter((migration) => {
    if (migrationResults.some((result) => result && result.id === migration.id)) {
      return false;
    }

    if (migration.skip?.(config)) {
      logger.info(`Skipping migration: ${migration.id}`);
      return false;
    }
    return true;
  });
};

const runMigration = async (migration: AutoMigration) => {
  try {
    logger.info(`Running migration: ${migration.id}`);
    await migration.migrate({
      logger: createLogger(migration.id),
    });
    logger.info(`Migration completed: ${migration.id}`);
    await migrationResultsRepository.insert({ ...newTimestampedEntity(migration.id), result: "COMPLETE" });
  } catch (e) {
    logger.warn(e, `Error running migration: ${migration.id}`);
    await migrationResultsRepository.insert({
      ...newTimestampedEntity(migration.id),
      result: "ERROR",
      error: (e as Error).message || "Unknown",
    });
  }
};

export const migrationBootstrapper: (migrations: AutoMigration[], config: MigrationConfig) => Bootstrapper =
  (migrations, environment) => async () => {
    if (migrations.length === 0) {
      logger.debug(`No migrations configured to run`);
      return;
    }

    await runWithRequestStorage(async () => {
      // TODO: Remove logger statement
      logger.info("DEBUG: before set firestore", firestoreProvider);

      // We need firestore loader in request storage if we want to use gae-js transactions
      firestoreLoaderRequestStorage.set(new FirestoreLoader(firestoreProvider.get()));

      // TODO: Remove logger statement
      logger.info("DEBUG: after set firestore");

      try {
        await mutexServiceProvider.get().obtain(MUTEX_ID, MUTEX_EXPIRY_SECONDS);
      } catch (e) {
        if (e instanceof MutexUnavailableError) {
          logger.info(`Unable to obtain migration mutex '${MUTEX_ID}'. Skipping all migrations.`);
          return;
        }
        throw e;
      }

      const migrationsToRun = await getMigrationsToRun(migrations, environment);

      logger.info(
        `${migrationsToRun.length} migrations to run, ${migrations.length - migrationsToRun.length} skipped.`
      );
      for (const migration of migrationsToRun) {
        await runMigration(migration);
      }

      await mutexServiceProvider.get().release(MUTEX_ID);
    });
  };
