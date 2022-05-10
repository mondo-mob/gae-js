import { migrationBootstrapper } from "./migration.bootstrapper";
import { AutoMigration, MigrationConfig } from "./auto-migration";
import { migrationResultsRepository } from "./migration-results.repository";
import { newTimestampedEntity } from "@mondomob/gae-js-firestore";
import { transactional, useFirestoreTest } from "./test-utils";
import { mutexServiceProvider } from "./mutex.service";
import { mutexesRepository } from "./mutexes.repository";

describe("migrationBootstrapper", () => {
  useFirestoreTest(["mutexes", "migrations"]);

  const config: MigrationConfig = {
    environment: "dev",
  };

  let migrationCount = 0;
  let migrations: AutoMigration[] = [];

  const testMigration1: AutoMigration = {
    id: "test-migration-1",
    migrate: async ({ logger }) => {
      logger.info("Running migration");
      migrationCount++;
    },
  };

  const testMigration2: AutoMigration = {
    id: "test-migration-2",
    skip: () => false,
    migrate: async ({ logger }) => {
      logger.info("Running migration");
      migrationCount++;
      throw new Error("i failed");
    },
  };

  const testMigration3: AutoMigration = {
    id: "test-migration-3",
    skip: () => true,
    migrate: async ({ logger }) => {
      logger.info("Running migration");
      migrationCount++;
      throw new Error("i should not run");
    },
  };

  beforeEach(() => {
    migrations.splice(0);
    migrations.push(testMigration1);
    migrations.push(testMigration2);
    migrations.push(testMigration3);
    migrationCount = 0;
  });

  it("runs configured migrations, skips configured ones, and records results in firestore", async () => {
    await migrationBootstrapper(migrations, config);

    expect(migrationCount).toBe(2);

    const result1 = await migrationResultsRepository.getRequired(testMigration1.id);
    expect(result1.result).toBe("COMPLETE");

    const result2 = await migrationResultsRepository.getRequired(testMigration2.id);
    expect(result2.result).toBe("ERROR");
    expect(result2.error).toBe("i failed");

    expect(await migrationResultsRepository.exists(testMigration3.id)).toBe(false);
  });

  it("skips migrations that have already been run successfully", async () => {
    await migrationResultsRepository.insert({
      ...newTimestampedEntity("test-migration-1"),
      result: "COMPLETE",
    });

    await migrationBootstrapper(migrations, config);

    expect(migrationCount).toBe(1);
  });

  it("skips migrations that have already been run with error", async () => {
    await migrationResultsRepository.insert({
      ...newTimestampedEntity("test-migration-1"),
      result: "ERROR",
    });

    await migrationBootstrapper(migrations, config);

    expect(migrationCount).toBe(1);
  });

  it(
    "skips all migrations if mutex unavailable",
    transactional(async () => {
      await mutexServiceProvider.get().obtain("migration-bootstrapper", 10);

      await migrationBootstrapper(migrations, config);

      expect(migrationCount).toBe(0);
    })
  );

  it("releases mutex after migrations run", async () => {
    await migrationBootstrapper(migrations, config);

    const mutex = await mutexesRepository.getRequired("migration-bootstrapper");

    expect(migrationCount).toBe(2);
    expect(mutex.locked).toBe(false);
  });
});
