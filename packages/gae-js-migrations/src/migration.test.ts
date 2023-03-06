import {
  FirestoreRepository,
  mutexesRepository,
  newTimestampedEntity,
  TimestampedEntity,
  TimestampedRepository,
} from "@mondomob/gae-js-firestore";
import { transactional, useFirestoreTest } from "./__test/test-utils";
import { AutoMigration } from "./auto-migration";
import { runMigrations } from "./migration";
import { migrationResultsRepository } from "./migration-results.repository";
import { mutexServiceProvider } from "./mutex";

const dummyEntityCollectionName = "migrations-dummy-entities";
const ORIG_CREATED_AT = new Date("1999-01-01T00:00:00");

describe("runMigrations", () => {
  useFirestoreTest(["mutexes", "migrations", dummyEntityCollectionName]);

  let migrationCount = 0;
  let migrations: AutoMigration[] = [];

  const testMigration1: AutoMigration = {
    id: "test-migration-1",
    migrate: async ({ logger }) => {
      logger.info("Running migration to update entity names");
      const existing = await testDummyEntityRepository.query();
      await testDummyEntityRepository.save(existing.map(({ name, ...rest }) => ({ name: `${name} UPDATED`, ...rest })));
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
    await nonAutoTimestampRepository.save({
      ...newTimestampedEntity("entity-1"),
      name: "name",
      createdAt: ORIG_CREATED_AT,
      updatedAt: ORIG_CREATED_AT,
    });
    migrations = [testMigration1, testMigration2, testMigration3];
    migrationCount = 0;
  });

  it(
    "runs configured migrations, skips configured ones, and records results in firestore",
    transactional(async () => {
      await runMigrations(migrations);

      expect(migrationCount).toBe(2);

      const results = await getMigrationResults();
      expect(results).toMatchObject([
        { id: "test-migration-1", result: "COMPLETE" },
        { id: "test-migration-2", result: "ERROR", error: "i failed" },
      ]);

      // First migration updated entities
      const [entity] = await testDummyEntityRepository.query();
      expect(entity).toMatchObject({
        id: "entity-1",
        name: "name UPDATED",
        createdAt: ORIG_CREATED_AT,
      });
      expectUpdatedAtAfterCreatedAt(entity);
    })
  );

  it(
    "skips migrations that have already been run successfully",
    transactional(async () => {
      await migrationResultsRepository.insert({
        ...newTimestampedEntity("test-migration-1"),
        result: "COMPLETE",
      });

      await runMigrations(migrations);

      expect(migrationCount).toBe(1);
    })
  );

  it(
    "skips migrations that have already been run with error",
    transactional(async () => {
      await migrationResultsRepository.insert({
        ...newTimestampedEntity("test-migration-1"),
        result: "ERROR",
      });

      await runMigrations(migrations);

      expect(migrationCount).toBe(1);
    })
  );

  it(
    "skips all migrations if mutex unavailable",
    transactional(async () => {
      await mutexServiceProvider.get().obtain("migrations");

      await runMigrations(migrations);

      expect(migrationCount).toBe(0);
    })
  );

  it(
    "releases mutex after migrations run",
    transactional(async () => {
      await runMigrations(migrations);

      const mutex = await mutexesRepository.getRequired("migrations");

      expect(migrationCount).toBe(2);
      expect(mutex.locked).toBe(false);
    })
  );

  describe("disableTimestampUpdate option", () => {
    it(
      "does not update timestamps when disableTimestampUpdate is enabled globally",
      transactional(async () => {
        await runMigrations([testMigration1], {
          disableTimestampUpdate: true,
        });

        const results = await getMigrationResults();
        expect(results).toMatchObject([{ id: "test-migration-1", result: "COMPLETE" }]);

        // First migration updated entities
        const [entity] = await testDummyEntityRepository.query();
        expect(entity).toMatchObject({
          id: "entity-1",
          name: "name UPDATED",
          createdAt: ORIG_CREATED_AT,
          updatedAt: ORIG_CREATED_AT,
        });
      })
    );

    it(
      "does not update timestamps when disableTimestampUpdate is disabled globally, but enabled for individual migration",
      transactional(async () => {
        await runMigrations(
          [
            {
              ...testMigration1,
              options: {
                disableTimestampUpdate: true,
              },
            },
          ],
          {
            disableTimestampUpdate: false,
          }
        );

        const results = await getMigrationResults();
        expect(results).toMatchObject([{ id: "test-migration-1", result: "COMPLETE" }]);

        // First migration updated entities
        const [entity] = await testDummyEntityRepository.query();
        expect(entity).toMatchObject({
          id: "entity-1",
          name: "name UPDATED",
          createdAt: ORIG_CREATED_AT,
          updatedAt: ORIG_CREATED_AT,
        });
      })
    );

    it(
      "updates timestamps when disableTimestampUpdate is enabled globally, but disabled for individual migration",
      transactional(async () => {
        await runMigrations(
          [
            {
              ...testMigration1,
              options: {
                disableTimestampUpdate: false,
              },
            },
          ],
          {
            disableTimestampUpdate: true,
          }
        );

        const results = await getMigrationResults();
        expect(results).toMatchObject([{ id: "test-migration-1", result: "COMPLETE" }]);

        // First migration updated entities
        const [entity] = await testDummyEntityRepository.query();
        expect(entity).toMatchObject({
          id: "entity-1",
          name: "name UPDATED",
          createdAt: ORIG_CREATED_AT,
        });
        expectUpdatedAtAfterCreatedAt(entity);
      })
    );
  });
});

interface DummyEntity extends TimestampedEntity {
  name: string;
}

const expectUpdatedAtAfterCreatedAt = ({ createdAt, updatedAt }: TimestampedEntity) =>
  expect(updatedAt > createdAt).toBe(true);

const getMigrationResults = () => migrationResultsRepository.query({ sort: [{ fieldPath: "id" }] });
const nonAutoTimestampRepository = new FirestoreRepository<DummyEntity>(dummyEntityCollectionName);
const testDummyEntityRepository = new TimestampedRepository<DummyEntity>(dummyEntityCollectionName);
