import { cloneDeep } from "lodash";
import { SecretsClient } from "./secrets.client";
import { SecretsResolver } from "./secrets.resolver";

const resolvedSecret = (key: string) => `SECRET-${key}`;
describe("SecretsResolver", () => {
  let secretsResolver: SecretsResolver;
  let mockSecretsClient: SecretsClient;

  beforeEach(() => {
    mockSecretsClient = new SecretsClient("foo");
    mockSecretsClient.fetchSecret = jest.fn().mockImplementation((key: string) => resolvedSecret(key));
    mockSecretsClient.fetchOptionalSecret = jest.fn();

    secretsResolver = new SecretsResolver({ secretsClient: mockSecretsClient });
  });

  describe("resolveSecrets", () => {
    it("recursively resolves secrets for string properties that contain SECRET()", async () => {
      const sourceObject = {
        foo: "bar",
        flag: true,
        array: [1, 2, 3],
        key: "SECRET(API_KEY)",
        nested: {
          foo: "bar",
          flag: true,
          array: [1, 2, 3],
          key: "SECRET(NESTED_KEY)",
          anotherNested: {
            foo: "bar",
            flag: true,
            array: [1, 2, 3],
            key: "SECRET(ANOTHER_NESTED_KEY)",
          },
        },
      };
      const expected = {
        ...sourceObject,
        key: resolvedSecret("API_KEY"),
        nested: {
          ...sourceObject.nested,
          key: resolvedSecret("NESTED_KEY"),
          anotherNested: {
            ...sourceObject.nested.anotherNested,
            key: resolvedSecret("ANOTHER_NESTED_KEY"),
          },
        },
      };

      const resolved = await secretsResolver.resolveSecrets(sourceObject);

      expect(resolved).toEqual(expected);
      expect(mockSecretsClient.fetchSecret).toHaveBeenCalledTimes(3);
    });

    it("returns the object with same values when it contains no secrets with SECRET()", async () => {
      const sourceObject = {
        foo: "bar",
        flag: true,
        array: [1, 2, 3],
        key: "key",
        nested: {
          foo: "bar",
          flag: true,
          array: [1, 2, 3],
          key: "key",
          anotherNested: {
            foo: "bar",
            flag: true,
            array: [1, 2, 3],
            key: "key",
          },
        },
      };
      const expected = cloneDeep(sourceObject);

      const resolved = await secretsResolver.resolveSecrets(sourceObject);

      expect(resolved).toEqual(expected);
      expect(mockSecretsClient.fetchSecret).not.toHaveBeenCalled();
    });
  });

  describe("resolveSecretIfRequired", () => {
    it("fetches the secret by key when valid key name inside SECRET()", async () => {
      const result = await secretsResolver.resolveSecretIfRequired("SECRET(MY_KEY-123)");

      expect(result).toBe(resolvedSecret("MY_KEY-123"));
    });

    it("fetches the secret by key when valid key name inside SECRET() and leading and trailing spaces", async () => {
      const result = await secretsResolver.resolveSecretIfRequired("  SECRET(MY_KEY)    ");

      expect(result).toBe(resolvedSecret("MY_KEY"));
    });

    it("fetches the secret by key when valid key name inside SECRET() and trims key", async () => {
      const result = await secretsResolver.resolveSecretIfRequired("  SECRET(   MY_KEY    )    ");

      expect(result).toBe(resolvedSecret("MY_KEY"));
    });

    it("returns the source string when not wrapped with SECRET()", async () => {
      const result = await secretsResolver.resolveSecretIfRequired("foo");

      expect(result).toBe("foo");
      expect(mockSecretsClient.fetchSecret).not.toHaveBeenCalled();
    });

    it("returns the source string when disallowed characters between SECRET()", async () => {
      const result = await secretsResolver.resolveSecretIfRequired("SECRET(ABC!@#$)");

      expect(result).toBe("SECRET(ABC!@#$)");
      expect(mockSecretsClient.fetchSecret).not.toHaveBeenCalled();
    });

    it("returns the source string when SECRET( missing last bracket", async () => {
      const result = await secretsResolver.resolveSecretIfRequired("SECRET(ABC");

      expect(result).toBe("SECRET(ABC");
      expect(mockSecretsClient.fetchSecret).not.toHaveBeenCalled();
    });
  });
});
