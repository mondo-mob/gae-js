import { UserRequestStorageProvider } from "./user-request-storage-provider";
import { AuthUser } from "./auth-user";
import { RequestStorageStore, runWithRequestStorage } from "../request-storage";

describe("UserRequestStorageProvider", () => {
  it("throws if storage not set", async () => {
    const provider = new UserRequestStorageProvider();

    expect(provider.hasValue()).toBe(false);
    expect(() => provider.get()).toThrow("No value has been set on this provider");
  });

  it("throws custom message if config not set", async () => {
    const provider = new UserRequestStorageProvider(undefined, "No User Storage has been set");

    expect(provider.hasValue()).toBe(false);
    expect(() => provider.get()).toThrow("No User Storage has been set");
  });

  it("supports custom user storage type", async () => {
    interface MyUser extends AuthUser {
      preferredName: string;
    }
    const user1: MyUser = { id: "user1", preferredName: "person1" };

    runWithRequestStorage(() => {
      const userStorage = new RequestStorageStore<MyUser>("_MYUSER");
      const provider = new UserRequestStorageProvider(userStorage);

      userStorage.set(user1);
      expect(provider.get().get()).toEqual(user1);

      provider.get().set(user1);
      expect(provider.get().get()).toEqual(user1);
    });
  });
});
