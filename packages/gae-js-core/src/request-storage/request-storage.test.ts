import {
  getRequestStorageValue,
  getRequestStorageValueOrDefault,
  runWithRequestStorage,
  setRequestStorageValue,
} from "./request-storage";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

describe("Request Storage", () => {
  describe("runWithRequestStorage", () => {
    it("runs separate async storage contexts", () => {
      runWithRequestStorage(() => {
        setRequestStorageValue("my-key", 99);
        const value = getRequestStorageValue("my-key");
        expect(value).toBe(99);
      });

      runWithRequestStorage(() => {
        const value = getRequestStorageValue("my-key");
        expect(value).toBe(null);
      });
    });

    it("returns value of callback", async () => {
      expect(runWithRequestStorage(() => 99)).toBe(99);
      await expect(runWithRequestStorage(() => Promise.resolve(99))).resolves.toEqual(99);
    });

    it("copies existing store into nested context", () => {
      runWithRequestStorage(async () => {
        setRequestStorageValue("my-key", 99);

        return runWithRequestStorage(async () => {
          expect(getRequestStorageValue("my-key")).toBe(99);
        });
      });
    });

    it("can override parent property in nested context", async () => {
      await runWithRequestStorage(async () => {
        setRequestStorageValue("my-key", "parent");

        const nestedPromise = runWithRequestStorage(async () => {
          expect(getRequestStorageValue("my-key")).toBe("parent");
          setRequestStorageValue("my-key", "nested");
          expect(getRequestStorageValue("my-key")).toBe("nested");
          await sleep(200);
          expect(getRequestStorageValue("my-key")).toBe("nested");
        });

        expect(getRequestStorageValue("my-key")).toBe("parent");
        return nestedPromise;
      });
    });
  });

  describe("getRequestStorageValue", () => {
    it("returns typed value when value has been set", () => {
      runWithRequestStorage(() => {
        setRequestStorageValue("my-key", 99);

        const value: number | null = getRequestStorageValue("my-key");

        expect(value).toBe(99);
      });
    });

    it("returns typed value when value has been set to falsy value", () => {
      runWithRequestStorage(() => {
        setRequestStorageValue("my-key", 0);

        const value: number | null = getRequestStorageValue("my-key");

        expect(value).toBe(0);
      });
    });

    it("returns null when active context exists with no value for key", () => {
      runWithRequestStorage(() => {
        expect(getRequestStorageValue("does-not-exist")).toBeNull();
      });
    });

    it("returns null when no active context exists", () => {
      expect(getRequestStorageValue("does-not-exist")).toBeNull();
    });
  });

  describe("getRequestStorageValueOrDefault", () => {
    it("returns default when storage not active", () => {
      expect(getRequestStorageValueOrDefault("my-key", "my-default")).toBe("my-default");
    });
    it("returns default when request scope setup and value not set", () => {
      runWithRequestStorage(() => expect(getRequestStorageValueOrDefault("my-key", "my-default")).toBe("my-default"));
    });
    it("returns value when request scope setup and value IS set", () => {
      runWithRequestStorage(() => {
        setRequestStorageValue("my-key", "my-value");
        expect(getRequestStorageValueOrDefault("my-key", "my-default")).toBe("my-value");
      });
    });
  });

  describe("setRequestStorageValue", () => {
    it("update typed value when value has been set", () => {
      runWithRequestStorage(() => {
        setRequestStorageValue("my-key", 99);
        setRequestStorageValue("my-key", 100);

        const value: number | null = getRequestStorageValue("my-key");

        expect(value).toBe(100);
      });
    });

    it("returns typed value when value has been set to falsy value", () => {
      runWithRequestStorage(() => {
        setRequestStorageValue("my-num", 99);
        setRequestStorageValue("my-num", 0);
        setRequestStorageValue("my-bool", true);
        setRequestStorageValue("my-bool", false);

        expect(getRequestStorageValue("my-num")).toBe(0);
        expect(getRequestStorageValue("my-bool")).toBe(false);
      });
    });

    it("throws exception when no request storage active", () => {
      expect(() => setRequestStorageValue("anything", "abc")).toThrowError("No request storage found");
    });
  });
});
