import { transactional, useFirestoreTest } from "../__test/test-utils";
import { MutexService } from "./mutex.service";
import { Mutex, mutexesRepository } from "./mutexes.repository";

describe("MutexService", () => {
  useFirestoreTest(["mutexes"]);
  let mutexService: MutexService;

  beforeEach(async () => {
    mutexService = new MutexService({ expirySeconds: 5 });
  });

  describe("obtain", () => {
    it(
      "obtains mutex for new id",
      transactional(async () => {
        const mutex = await mutexService.obtain("test1", { expirySeconds: 10 });
        expect(mutex.id).toBe("test1");
        expect(mutex.locked).toBeTruthy();
        expect(secondsDifference(mutex.expiredAt, mutex.obtainedAt)).toBe(10);
      })
    );

    it(
      "obtains mutex for new id with default expiry seconds",
      transactional(async () => {
        const mutex = await mutexService.obtain("test1");
        expect(mutex.id).toBe("test1");
        expect(mutex.locked).toBeTruthy();
        expect(secondsDifference(mutex.expiredAt, mutex.obtainedAt)).toBe(5);
      })
    );

    it(
      "throws if mutex already active",
      transactional(async () => {
        await mutexService.obtain("test1");
        await expect(() => mutexService.obtain("test1")).rejects.toThrow(
          "Mutex test1 already active for another process"
        );
      })
    );

    it(
      "obtains mutex for previously released id",
      transactional(async () => {
        await mutexService.obtain("test1");
        await mutexService.release("test1");

        const mutex = await mutexService.obtain("test1");

        expect(mutex.id).toBe("test1");
        expect(mutex.locked).toBeTruthy();
      })
    );

    it(
      "obtains mutex for previously expired id",
      transactional(async () => {
        // Use negative timeout as quick way to automatically expire
        await mutexService.obtain("test1", { expirySeconds: -10 });

        const mutex = await mutexService.obtain("test1");

        expect(mutex.id).toBe("test1");
        expect(mutex.locked).toBeTruthy();
      })
    );
  });

  describe("release", () => {
    it(
      "releases active mutex",
      transactional(async () => {
        const obtained = await mutexService.obtain("test1");
        expect(obtained.locked).toBeTruthy();

        const released = await mutexService.release("test1");
        expect(released).toBeTruthy();
        expect(released?.locked).toBeFalsy();
      })
    );

    it(
      "allows releasing non-existent mutex",
      transactional(async () => {
        const mutex = await mutexService.release("i-dont-exist");
        expect(mutex).toBe(null);
      })
    );
  });

  describe("withMutex", () => {
    let executorFunction: jest.Mock;
    beforeEach(() => {
      executorFunction = jest.fn(() => "result");
    });

    it(
      "executes with mutex and releases after running",
      transactional(async () => {
        await expect(mutexService.withMutex("test1", executorFunction)).resolves.toBe("result");

        expect(executorFunction).toHaveBeenCalled();

        await expectMutex("test1", {
          locked: false,
        });
      })
    );

    it(
      "throws when executor throws, and unlocks mutex",
      transactional(async () => {
        executorFunction = jest.fn(() => {
          throw new Error("Test error");
        });

        await expect(mutexService.withMutex("test1", executorFunction)).rejects.toThrow("Test error");

        expect(executorFunction).toHaveBeenCalled();

        await expectMutex("test1", {
          locked: false,
        });
      })
    );

    it(
      "throws if mutex already locked and does not call executor",
      transactional(async () => {
        await mutexService.obtain("test1");

        await expect(mutexService.withMutex("test1", executorFunction)).rejects.toThrow(
          "Mutex test1 already active for another process"
        );

        expect(executorFunction).not.toHaveBeenCalled();

        await expectMutex("test1", {
          locked: true,
        });
      })
    );
  });

  describe("withMutexSilent", () => {
    let executorFunction: jest.Mock;
    beforeEach(() => {
      executorFunction = jest.fn(() => "result");
    });

    it(
      "executes with mutex and releases after running",
      transactional(async () => {
        await expect(mutexService.withMutexSilent("test1", executorFunction)).resolves.toBeUndefined();

        expect(executorFunction).toHaveBeenCalled();

        await expectMutex("test1", {
          locked: false,
        });
      })
    );

    it(
      "throws when executor throws, and unlocks mutex",
      transactional(async () => {
        executorFunction = jest.fn(() => {
          throw new Error("Test error");
        });

        await expect(mutexService.withMutexSilent("test1", executorFunction)).rejects.toThrow("Test error");

        expect(executorFunction).toHaveBeenCalled();

        await expectMutex("test1", {
          locked: false,
        });
      })
    );

    it(
      "does not throw error when mutex already lock and does not call executor function",
      transactional(async () => {
        await mutexService.obtain("test1");

        await expect(mutexService.withMutexSilent("test1", executorFunction)).resolves.toBeUndefined();

        expect(executorFunction).not.toHaveBeenCalled();

        await expectMutex("test1", {
          locked: true,
        });
      })
    );

    it(
      "calls supplied handler when mutex is locked",
      transactional(async () => {
        const handler = jest.fn();
        await mutexService.obtain("test1");

        await expect(
          mutexService.withMutexSilent("test1", executorFunction, { onMutexUnavailable: handler })
        ).resolves.toBeUndefined();

        expect(executorFunction).not.toHaveBeenCalled();
        expect(handler).toHaveBeenCalled();

        await expectMutex("test1", {
          locked: true,
        });
      })
    );
  });

  describe("with prefixes", () => {
    beforeEach(() => {
      mutexService = new MutexService({
        expirySeconds: 5,
        prefixes: ["grandparent", "parent"],
      });
    });

    describe("obtain", () => {
      it(
        "obtains mutex for new id",
        transactional(async () => {
          const mutex = await mutexService.obtain("test1", { expirySeconds: 10 });
          expect(mutex.id).toBe("grandparent::parent::test1");
          expect(mutex.locked).toBeTruthy();
          expect(secondsDifference(mutex.expiredAt, mutex.obtainedAt)).toBe(10);
        })
      );

      it(
        "obtains mutex for new id with custom separator",
        transactional(async () => {
          mutexService = new MutexService({
            expirySeconds: 5,
            prefixes: ["grandparent", "parent"],
            prefixSeparator: "--",
          });
          const mutex = await mutexService.obtain("test1", { expirySeconds: 10 });
          expect(mutex.id).toBe("grandparent--parent--test1");
          expect(mutex.locked).toBeTruthy();
          expect(secondsDifference(mutex.expiredAt, mutex.obtainedAt)).toBe(10);
        })
      );

      it(
        "obtains mutex for new id with default expiry seconds",
        transactional(async () => {
          const mutex = await mutexService.obtain("test1");
          expect(mutex.id).toBe("grandparent::parent::test1");
          expect(mutex.locked).toBeTruthy();
          expect(secondsDifference(mutex.expiredAt, mutex.obtainedAt)).toBe(5);
        })
      );
    });

    describe("release", () => {
      it(
        "releases active mutex",
        transactional(async () => {
          const obtained = await mutexService.obtain("test1");
          expect(obtained.locked).toBeTruthy();

          const released = await mutexService.release("test1");
          expect(released).toBeDefined();
          expect(released?.locked).toBeFalsy();
        })
      );
    });
  });
});

const expectMutex = async (id: string, expectations: Partial<Mutex>) => {
  const mutex = await mutexesRepository.getRequired(id);
  expect(mutex).toMatchObject(expectations);
  return mutex;
};

const secondsDifference = (srcIso: string, origIso: string) =>
  new Date(srcIso).getSeconds() - new Date(origIso).getSeconds();
