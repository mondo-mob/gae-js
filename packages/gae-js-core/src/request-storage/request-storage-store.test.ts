import { runWithRequestStorage, setRequestStorageValue } from "./request-storage";
import { RequestStorageStore } from "./request-storage-store";
import { DataValidator } from "../util";

describe("Request Storage Store", () => {
  describe("get", () => {
    it("returns typed value when value has been set", () => {
      runWithRequestStorage(() => {
        setRequestStorageValue("TEST", 99);

        const store = new RequestStorageStore("TEST");
        const value = store.get();

        expect(value).toBe(99);
      });
    });

    it("returns typed value when value has been set to falsy value", () => {
      runWithRequestStorage(() => {
        setRequestStorageValue("TEST", 0);

        const store = new RequestStorageStore("TEST");
        const value = store.get();

        expect(value).toBe(0);
      });
    });

    it("returns null when active context exists with no value for key", () => {
      runWithRequestStorage(() => {
        const store = new RequestStorageStore("TEST");
        expect(store.get()).toBeNull();
      });
    });

    it("returns null when no active context exists", () => {
      const store = new RequestStorageStore("TEST");
      expect(store.get()).toBeNull();
    });
  });

  describe("getWithDefault", () => {
    it("returns default when storage not active", () => {
      const store = new RequestStorageStore("TEST");
      expect(store.getWithDefault("my-default")).toBe("my-default");
    });

    it("returns default when request scope setup and value not set", () => {
      runWithRequestStorage(() => {
        const store = new RequestStorageStore("TEST");
        expect(store.getWithDefault("my-default")).toBe("my-default");
      });
    });

    it("returns value when request scope setup and value is set", () => {
      runWithRequestStorage(() => {
        setRequestStorageValue("TEST", "my-value");
        const store = new RequestStorageStore("TEST");
        expect(store.getWithDefault("my-default")).toBe("my-value");
      });
    });
  });

  describe("getRequired", () => {
    it("throws error when storage not active", () => {
      const store = new RequestStorageStore("TEST");
      expect(() => store.getRequired()).toThrowError("No request storage value exists for key: TEST");
    });

    it("throw error when request scope setup and value not set", () => {
      runWithRequestStorage(() => {
        const store = new RequestStorageStore("TEST");
        expect(() => store.getRequired()).toThrowError("No request storage value exists for key: TEST");
      });
    });

    it("returns value when request scope setup and value is set", () => {
      runWithRequestStorage(() => {
        setRequestStorageValue("TEST", "my-value");
        const store = new RequestStorageStore("TEST");
        expect(store.getRequired()).toBe("my-value");
      });
    });
  });

  describe("set", () => {
    it("update typed value when value has been set", () => {
      runWithRequestStorage(() => {
        const store = new RequestStorageStore("TEST");
        setRequestStorageValue("TEST", 99);
        store.set(100);

        const value = store.get();

        expect(value).toBe(100);
      });
    });

    it("returns typed value when value has been set to falsy value", () => {
      runWithRequestStorage(() => {
        const numStore = new RequestStorageStore<number>("my-num");
        const boolStore = new RequestStorageStore<boolean>("my-bool");
        setRequestStorageValue("my-num", 99);
        setRequestStorageValue("my-bool", true);

        numStore.set(0);
        boolStore.set(false);

        expect(numStore.get()).toBe(0);
        expect(boolStore.get()).toBe(false);
      });
    });

    it("throws exception when no request storage active", () => {
      expect(() => setRequestStorageValue("anything", "abc")).toThrowError("No request storage found");
    });

    describe("validation", () => {
      const alwaysPasses: DataValidator<string> = (data) => data as string;
      const alwaysFails: DataValidator<string> = () => {
        throw new Error("invalid");
      };

      it("sets value when validator passes", () => {
        runWithRequestStorage(() => {
          const passStore = new RequestStorageStore<string>("my-string", alwaysPasses);
          expect(passStore.get()).toBeNull();
          expect(passStore.set("abc")).toEqual("abc");
          expect(passStore.get()).toEqual("abc");
        });
      });

      it("throws for invalid input when validator set", () => {
        runWithRequestStorage(() => {
          const failStore = new RequestStorageStore<string>("my-string", alwaysFails);
          expect(() => failStore.set("abc")).toThrow("invalid");
        });
      });
    });
  });
});
