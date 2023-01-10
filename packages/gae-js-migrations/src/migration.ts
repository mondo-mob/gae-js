import { Bootstrapper, createLogger, runWithRequestStorage } from "@mondomob/gae-js-core";
import {
  FirestoreLoader,
  firestoreLoaderRequestStorage,
  firestoreProvider,
  newTimestampedEntity,
} from "@mondomob/gae-js-firestore";
import { AutoMigration } from "./auto-migration";
import { migrationResultsRepository } from "./migration-results.repository";
import { mutexServiceProvider } from "./mutex";

const logger = createLogger("migrations");
const MUTEX_ID = "migrations";

const getMigrationsToRun = async (migrations: AutoMigration[]) => {
  const migrationResults = await migrationResultsRepository.get(migrations.map((m) => m.id));
  return migrations.filter((migration) => {
    if (migrationResults.some((result) => result && result.id === migration.id)) {
      return false;
    }

    if (migration.skip?.()) {
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

export const runMigrations = async (migrations: AutoMigration[]) => {
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
        await runMigration(migration);
      }
    },
    {
      onMutexUnavailable: () => logger.info(`Unable to obtain migration mutex '${MUTEX_ID}'. Skipping all migrations.`),
    }
  );
};

export const bootstrapMigrations: (migrations: AutoMigration[]) => Bootstrapper =
  (migrations: AutoMigration[]) => async () => {
    await runWithRequestStorage(async () => {
      // We need firestore loader in request storage if we want to use gae-js transactions
      firestoreLoaderRequestStorage.set(new FirestoreLoader(firestoreProvider.get()));

      await runMigrations(migrations);
    });
  };
