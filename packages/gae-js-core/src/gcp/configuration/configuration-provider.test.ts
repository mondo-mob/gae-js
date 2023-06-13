import { z } from "zod";
import { zodValidator } from "../../util";
import { ConfigurationProvider } from "./configuration-provider";
import { gaeJsCoreConfigurationSchema } from "./schema";
import { ENV_VAR_CONFIG_OVERRIDES } from "../../configuration/variables";
import { ENV_VAR_PROJECT } from "./variables";

const testConfigSchema = gaeJsCoreConfigurationSchema.extend({
  appName: z.string(),
});
type TestConfig = z.infer<typeof testConfigSchema>;

const validator = zodValidator(testConfigSchema);

describe("ConfigurationProvider", () => {
  beforeEach(() => {
    process.env[ENV_VAR_PROJECT] = "gaejs-tests";
    process.env[ENV_VAR_CONFIG_OVERRIDES] = JSON.stringify({
      host: "localhost",
      location: "local",
      appName: "Test app",
    });
  });
  afterEach(() => {
    process.env[ENV_VAR_CONFIG_OVERRIDES] = undefined;
    process.env[ENV_VAR_PROJECT] = undefined;
  });

  it("throws if config not set", async () => {
    const provider = new ConfigurationProvider<TestConfig>();

    expect(provider.hasValue()).toBe(false);
    expect(() => provider.get()).toThrow("No value has been set on this provider");
  });

  it("throws custom message if config not set", async () => {
    const provider = new ConfigurationProvider<TestConfig>(undefined, "No Configuration has been set");

    expect(provider.hasValue()).toBe(false);
    expect(() => provider.get()).toThrow("No Configuration has been set");
  });

  it("inits config into typed provider", async () => {
    const provider = new ConfigurationProvider<TestConfig>();
    await provider.init({ validator });

    expect(provider.hasValue()).toBe(true);
    expect(provider.get()).toBeTruthy();
    expect(provider.get().projectId).toBe("gaejs-tests");
    expect(provider.get().appName).toBe("Test app");
  });

  it("inits config into untyped provider", async () => {
    const provider = new ConfigurationProvider();
    await provider.init({ validator });

    expect(provider.hasValue()).toBe(true);
    expect(provider.get()).toBeTruthy();
    expect(provider.get().projectId).toBe("gaejs-tests");
    expect(provider.get<TestConfig>().appName).toBe("Test app");
  });
});
