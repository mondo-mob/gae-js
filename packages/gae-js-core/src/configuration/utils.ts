import * as t from "io-ts";
import _ from "lodash";
import { createLogger } from "../logging";
import reporter from "io-ts-reporters";
import { isLeft } from "fp-ts/Either";
import { GaeJsCoreConfiguration } from "./schema";
import { configurationStore } from "./configuration-store";
import { SecretsResolver } from "./secrets/secrets.resolver";
import { SecretsClient } from "./secrets/secrets.client";

const LOCAL_DEV_ENVIRONMENT = "development";

export const initialiseConfiguration = async <T extends GaeJsCoreConfiguration>(validator: t.Type<T>): Promise<T> => {
  const configuration = loadConfiguration(validator);
  const configWithSecrets = await resolveSecrets(configuration);
  configurationStore.set(configWithSecrets);
  return configWithSecrets;
};

export const resolveSecrets = async <T extends GaeJsCoreConfiguration>(config: T): Promise<T> => {
  const logger = createLogger("resolveSecrets");
  const secretsProjectId = config.secretsProjectId || config.projectId;
  logger.info(`Using secrets projectId: ${secretsProjectId}`);
  const secretsResolver = new SecretsResolver(new SecretsClient(secretsProjectId));
  logger.info("Resolving all secrets ...");
  const configWithSecrets = await secretsResolver.resolveSecrets(config);
  logger.info("Secrets resolved");
  return configWithSecrets;
};

export const loadConfiguration = <T extends GaeJsCoreConfiguration>(validator: t.Type<T>): T => {
  const logger = createLogger("loadConfiguration");

  if (process.env.GOOGLE_CLOUD_PROJECT) {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    process.env.NODE_CONFIG_ENV = _.last(projectId.split("-"));
  } else if (!process.env.NODE_CONFIG_ENV) {
    process.env.NODE_CONFIG_ENV = LOCAL_DEV_ENVIRONMENT;
  }

  process.env.NODE_CONFIG_STRICT_MODE = "true";
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeConfig = require("config");
  const mergedConfig: Record<string, unknown> = {};
  const configSources: any = nodeConfig.util.getConfigSources();
  configSources.forEach((config: any) => {
    logger.info(`Loading config from ${config.name}`);
    nodeConfig.util.extendDeep(mergedConfig, config.parsed);
  });

  logger.info(`Applying environment variables to config`);
  const withEnvironment = nodeConfig.util.extendDeep(mergedConfig, process.env);

  const decodedConfig = validator.decode(withEnvironment);
  if (isLeft(decodedConfig)) {
    logger.error(reporter.report(decodedConfig));
    throw Error("Configuration does not confirm to expected format");
  }

  return decodedConfig.right;
};
