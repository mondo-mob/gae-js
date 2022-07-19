import { runMigrations } from "./migration";
import { AutoMigration } from "./auto-migration";
import { migrationResultsRepository } from "./migration-results.repository";
import { mutexesRepository, newTimestampedEntity } from "@mondomob/gae-js-firestore";
import { transactional, useFirestoreTest } from "./__test/test-utils";
import { mutexServiceProvider } from "./mutex";

describe("runMigrations", () => {
  useFirestoreTest(["mutexes", "migrations"]);

  let migrationCount = 0;
  const migrations: AutoMigration[] = [];

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

  beforeEach(async () => {
    migrations.splice(0);
    migrations.push(testMigration1);
    migrations.push(testMigration2);
    migrations.push(testMigration3);
    migrationCount = 0;
  });

  describe("runMigrations", () => {
    it("runs configured migrations, skips configured ones, and records results in firestore", async () => {
      await transactional(async () => {
        await runMigrations(migrations);

        expect(migrationCount).toBe(2);

        const result1 = await migrationResultsRepository.getRequired(testMigration1.id);
        expect(result1.result).toBe("COMPLETE");

        const result2 = await migrationResultsRepository.getRequired(testMigration2.id);
        expect(result2.result).toBe("ERROR");
        expect(result2.error).toBe("i failed");

        expect(await migrationResultsRepository.exists(testMigration3.id)).toBe(false);
      });
    });

    it("skips migrations that have already been run successfully", async () => {
      await transactional(async () => {
        await migrationResultsRepository.insert({
          ...newTimestampedEntity("test-migration-1"),
          result: "COMPLETE",
        });

        await runMigrations(migrations);

        expect(migrationCount).toBe(1);
      });
    });

    it("skips migrations that have already been run with error", async () => {
      await transactional(async () => {
        await migrationResultsRepository.insert({
          ...newTimestampedEntity("test-migration-1"),
          result: "ERROR",
        });

        await runMigrations(migrations);

        expect(migrationCount).toBe(1);
      });
    });

    it("skips all migrations if mutex unavailable", async () => {
      await transactional(async () => {
        await mutexServiceProvider.get().obtain("migration-bootstrapper");

        await runMigrations(migrations);

        expect(migrationCount).toBe(0);
      });
    });

    it("releases mutex after migrations run", async () => {
      await transactional(async () => {
        await runMigrations(migrations);

        const mutex = await mutexesRepository.getRequired("migration-bootstrapper");

        expect(migrationCount).toBe(2);
        expect(mutex.locked).toBe(false);
      });
    });
  });
});
