import { transactional, useFirestoreTest } from "../__test/test-utils";
import { MutexService } from "./mutex.service";

describe("MutexService", () => {
  useFirestoreTest(["mutexes"]);
  let mutexService: MutexService;

  beforeEach(async () => {
    mutexService = new MutexService({ defaultExpirySeconds: 5 });
  });

  describe("obtain", () => {
    it(
      "obtains mutex for new id",
      transactional(async () => {
        const mutex = await mutexService.obtain("test1", 10);
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
        await mutexService.obtain("test1", 10);
        await expect(() => mutexService.obtain("test1", 10)).rejects.toThrow(
          "Mutex test1 already active for another process"
        );
      })
    );

    it(
      "obtains mutex for previously released id",
      transactional(async () => {
        await mutexService.obtain("test1", 10);
        await mutexService.release("test1");

        const mutex = await mutexService.obtain("test1", 10);

        expect(mutex.id).toBe("test1");
        expect(mutex.locked).toBeTruthy();
      })
    );

    it(
      "obtains mutex for previously expired id",
      transactional(async () => {
        // Use negative timeout as quick way to automatically expire
        await mutexService.obtain("test1", -10);

        const mutex = await mutexService.obtain("test1", 10);

        expect(mutex.id).toBe("test1");
        expect(mutex.locked).toBeTruthy();
      })
    );
  });

  describe("release", () => {
    it(
      "releases active mutex",
      transactional(async () => {
        const obtained = await mutexService.obtain("test1", 10);
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

  describe("with prefixes", () => {
    beforeEach(() => {
      mutexService = new MutexService({
        defaultExpirySeconds: 5,
        prefixes: ["grandparent", "parent"],
      });
    });

    describe("obtain", () => {
      it(
        "obtains mutex for new id",
        transactional(async () => {
          const mutex = await mutexService.obtain("test1", 10);
          expect(mutex.id).toBe("grandparent::parent::test1");
          expect(mutex.locked).toBeTruthy();
          expect(secondsDifference(mutex.expiredAt, mutex.obtainedAt)).toBe(10);
        })
      );

      it(
        "obtains mutex for new id with custom separator",
        transactional(async () => {
          mutexService = new MutexService({
            defaultExpirySeconds: 5,
            prefixes: ["grandparent", "parent"],
            prefixSeparator: "--",
          });
          const mutex = await mutexService.obtain("test1", 10);
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
          const obtained = await mutexService.obtain("test1", 10);
          expect(obtained.locked).toBeTruthy();

          const released = await mutexService.release("test1");
          expect(released).toBeDefined();
          expect(released?.locked).toBeFalsy();
        })
      );
    });
  });
});

const secondsDifference = (srcIso: string, origIso: string) =>
  new Date(srcIso).getSeconds() - new Date(origIso).getSeconds();
