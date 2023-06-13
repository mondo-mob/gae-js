import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { z } from "zod";
import { withEnvVars } from "../../__test/test-utils";
import { zodValidator } from "../../util";
import { ConfigValidator } from "../../configuration/configuration";
import { gaeJsCoreConfigurationSchema } from "./schema";
import { ENV_VAR_CONFIG_OVERRIDES } from "../../configuration/variables";
import { ConfigurationOptions, initialiseConfiguration } from "./configuration";
import { ENV_VAR_CONFIG_ENV, ENV_VAR_PROJECT } from "./variables";
import SpyInstance = jest.SpyInstance;

const configSchema = gaeJsCoreConfigurationSchema.extend({
  customString: z.string(),
});

type Config = z.infer<typeof configSchema>;

const validator = zodValidator(configSchema);

const withOptions = (overrides?: Partial<ConfigurationOptions<Config>>): ConfigurationOptions<Config> => ({
  projectId: "gae-js-jest",
  validator,
  ...overrides,
});

const fromDir = (dir: string, overrides?: Partial<ConfigurationOptions<Config>>): ConfigurationOptions<Config> =>
  withOptions({
    configDir: `${__dirname}/../../configuration/__test/${dir}`,
    ...overrides,
  });

describe("configuration", () => {
  let accessSecretVersionSpy: SpyInstance;
  beforeEach(() => {
    const cwdSpy = jest.spyOn(process, "cwd");
    cwdSpy.mockReturnValue(`${__dirname}/../../configuration/__test`);
    accessSecretVersionSpy = jest.spyOn(SecretManagerServiceClient.prototype, "accessSecretVersion");
  });

  describe("initialiseConfiguration", () => {
    describe("file loading", () => {
      it("defaults to current working directory/config", async () => {
        const config = await initialiseConfiguration(withOptions());

        expect(config).toEqual({
          projectId: "gae-js-jest",
          environment: "jest",
          customString: "config environment file string",
        });
      });

      it("loads config from default and environment files", async () => {
        const config = await initialiseConfiguration(fromDir("with-environment"));

        expect(config).toEqual({
          projectId: "gae-js-jest",
          environment: "jest",
          customString: "with-environment environment file string",
        });
      });

      it("ignores missing environment file", async () => {
        const config = await initialiseConfiguration(fromDir("no-environment"));

        expect(config).toEqual({
          projectId: "gae-js-jest",
          environment: "jest",
          customString: "default string",
        });
      });

      it("ignores missing default file", async () => {
        const config = await initialiseConfiguration(fromDir("no-default"));

        expect(config).toEqual({
          projectId: "gae-js-jest",
          environment: "jest",
          customString: "no-default environment file string",
        });
      });

      it("does not throw if configDir missing (and config still valid)", async () => {
        const config = await initialiseConfiguration(
          fromDir("not-a-folder", { overrides: { customString: "options string" } })
        );

        expect(config).toEqual({
          projectId: "gae-js-jest",
          environment: "jest",
          customString: "options string",
        });
      });

      it("throws for invalid json file", async () => {
        await expect(() => initialiseConfiguration(fromDir("invalid-json"))).rejects.toThrow(
          "Cannot parse config source"
        );
      });
    });

    describe("projectId resolution", () => {
      it("resolves projectId passed directly", async () => {
        const config = await initialiseConfiguration(withOptions({ projectId: "proj-direct" }));

        expect(config.projectId).toBe("proj-direct");
      });

      it(
        "resolves projectId from gae-js environment variable",
        withEnvVars({ [ENV_VAR_PROJECT]: "proj-envvar" }, async () => {
          const config = await initialiseConfiguration(withOptions({ projectId: undefined }));

          expect(config.projectId).toBe("proj-envvar");
        })
      );

      it(
        "resolves projectId from appengine environment variable",
        withEnvVars({ GOOGLE_CLOUD_PROJECT: "proj-gcpvar" }, async () => {
          const config = await initialiseConfiguration(withOptions({ projectId: undefined }));

          expect(config.projectId).toBe("proj-gcpvar");
        })
      );
    });

    describe("environment resolution", () => {
      it("default strategy determines environment from project id suffix", async () => {
        const config = await initialiseConfiguration(withOptions({ projectId: "project-id-with-suffix-special" }));

        expect(config.environment).toBe("special");
      });

      it("can pass environment directly in options", async () => {
        const config = await initialiseConfiguration(withOptions({ environment: "special" }));

        expect(config.environment).toBe("special");
      });

      it(
        "can set environment as environment variable",
        withEnvVars({ [ENV_VAR_CONFIG_ENV]: "special" }, async () => {
          const config = await initialiseConfiguration(withOptions({ environment: "special" }));

          expect(config.environment).toBe("special");
        })
      );

      it("can pass custom strategy", async () => {
        const config = await initialiseConfiguration(
          withOptions({
            environment: (projectId) => projectId?.substring(0, 6),
          })
        );

        expect(config.environment).toBe("gae-js");
      });
    });

    describe("secrets resolution", () => {
      it(
        "loads configuration and resolves secrets",
        withEnvVars(
          {
            [ENV_VAR_CONFIG_OVERRIDES]: JSON.stringify({
              customString: "SECRET(MY_SECRET)",
            }),
          },
          async () => {
            accessSecretVersionSpy.mockImplementationOnce(() =>
              Promise.resolve([{ payload: { data: "top secret value" } }])
            );

            const config = await initialiseConfiguration(withOptions());

            expect(config).toEqual({
              projectId: "gae-js-jest",
              environment: "jest",
              customString: "top secret value",
            });
            expect(accessSecretVersionSpy).toHaveBeenCalledWith({
              name: "projects/gae-js-jest/secrets/MY_SECRET/versions/latest",
            });
          }
        )
      );
    });
  });

  describe("validation", () => {
    const alwaysPasses: ConfigValidator<Config> = (data) => data as Config;
    const alwaysFails: ConfigValidator<Config> = () => {
      throw new Error("invalid prop blah");
    };

    it("returns config when validator passes", async () => {
      const config = await initialiseConfiguration(withOptions({ validator: alwaysPasses }));
      expect(config).toEqual({
        projectId: "gae-js-jest",
        environment: "jest",
        customString: "config environment file string",
      });
    });

    it("throws when validator throws", async () => {
      await expect(() => initialiseConfiguration(withOptions({ validator: alwaysFails }))).rejects.toThrow("invalid");
    });

    it("should only validate after config fully resolved", async () => {
      accessSecretVersionSpy.mockImplementationOnce(() =>
        Promise.resolve([{ payload: { data: "long top secret value" } }])
      );

      // Raw value SECRET(MY_SECRET) doesn't pass this validation
      // We only want validation to run after secret has been resolved
      const secretLengthValidator = zodValidator(
        gaeJsCoreConfigurationSchema.extend({
          customString: z.string().min(20),
        })
      );

      const config = await initialiseConfiguration(
        withOptions({ validator: secretLengthValidator, overrides: { customString: "SECRET(MY_SECRET)" } })
      );

      expect(config).toEqual({
        projectId: "gae-js-jest",
        environment: "jest",
        customString: "long top secret value",
      });
    });
  });

  it("overrides from environment variable", async () => {
    process.env[ENV_VAR_CONFIG_OVERRIDES] = JSON.stringify({
      customString: "env var string",
    });
    const config = await initialiseConfiguration({
      projectId: "gae-js-jest",
      validator,
      configDir: `${__dirname}/__test/with-environment`,
    });
    expect(config).toEqual({
      projectId: "gae-js-jest",
      environment: "jest",
      customString: "env var string",
    });
  });

  it("overrides from options take highest precedence", async () => {
    process.env[ENV_VAR_CONFIG_OVERRIDES] = JSON.stringify({
      customString: "env var string",
    });
    const config = await initialiseConfiguration({
      projectId: "gae-js-jest",
      validator,
      configDir: `${__dirname}/__test/with-environment`,
      overrides: {
        customString: "options string",
      },
    });
    expect(config).toEqual({
      projectId: "gae-js-jest",
      environment: "jest",
      customString: "options string",
    });
  });
});
