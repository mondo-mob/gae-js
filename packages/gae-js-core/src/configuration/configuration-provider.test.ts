import * as t from "io-ts";
import { ConfigurationProvider } from "./configuration-provider";
import { gaeJsCoreConfigurationSchema } from "./schema";

const testConfigSchema = t.intersection([
  gaeJsCoreConfigurationSchema,
  t.type({
    appName: t.string,
  }),
]);
type TestConfig = t.TypeOf<typeof testConfigSchema>;

describe("ConfigurationProvider", () => {
  beforeEach(() => {
    process.env.NODE_CONFIG = JSON.stringify({
      projectId: "gaejs-tests",
      host: "localhost",
      location: "local",
      appName: "Test app",
    });
  });
  afterEach(() => {
    process.env.NODE_CONFIG = undefined;
  });

  it("throws if config not set", async () => {
    const provider = new ConfigurationProvider<TestConfig>();

    expect(() => provider.get()).toThrow("No value has been set");
  });

  it("inits config into typed provider", async () => {
    const provider = new ConfigurationProvider<TestConfig>();
    await provider.init(testConfigSchema);

    expect(provider.get()).toBeTruthy();
    expect(provider.get().projectId).toBe("gaejs-tests");
    expect(provider.get().appName).toBe("Test app");
  });

  it("inits config into untyped provider", async () => {
    const provider = new ConfigurationProvider();
    await provider.init(testConfigSchema);

    expect(provider.get()).toBeTruthy();
    expect(provider.get().projectId).toBe("gaejs-tests");
    expect(provider.get<TestConfig>().appName).toBe("Test app");
  });
});
