import { AuthUser, userRequestStorageProvider } from "../auth";
import { RequestStorageStore, runWithRequestStorage } from "../request-storage";
import { bootstrap } from "./bootstrap.service";

describe("boostrap-service", () => {
  describe("bootstrap", () => {
    it("executes all bootstrapper functions in order", async () => {
      const testFunction = jest.fn();

      await bootstrap([
        () => testFunction(1),
        async () => {
          await testSleep(5);
          testFunction(2);
        },
        () => testFunction(3),
      ]);

      expect(testFunction).toHaveBeenCalledTimes(3);
      expect(testFunction).toHaveBeenNthCalledWith(1, 1);
      expect(testFunction).toHaveBeenNthCalledWith(2, 2);
      expect(testFunction).toHaveBeenNthCalledWith(3, 3);
    });

    it("executes bootstrappers with supplied user", async () => {
      const testUser: AuthUser = { id: "test-1" };
      const testFunction = jest.fn();
      userRequestStorageProvider.set(new RequestStorageStore("__TEST_USER"));

      await bootstrap([() => testFunction(userRequestStorageProvider.get().get())], {
        user: testUser,
      });

      expect(testFunction).toHaveBeenCalledWith(testUser);
    });

    it("executes bootstrappers with supplied user and does not affect existing request context user after running", async () => {
      const existingContextUser: AuthUser = { id: "existing-context-user" };
      const testUser: AuthUser = { id: "test-1" };
      const testFunction = jest.fn();
      userRequestStorageProvider.set(new RequestStorageStore("__TEST_USER"));

      await runWithRequestStorage(async () => {
        userRequestStorageProvider.get().set(existingContextUser);

        await bootstrap([() => testFunction(userRequestStorageProvider.get().get())], {
          user: testUser,
        });

        expect(testFunction).toHaveBeenCalledWith(testUser);
        expect(userRequestStorageProvider.get().get()).toBe(existingContextUser);
      });
    });
  });
});

const testSleep = (millis: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, millis));
