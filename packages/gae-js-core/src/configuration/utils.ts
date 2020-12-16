import * as t from "io-ts";
import _ from "lodash";
import { createLogger } from "../logging";
import reporter from "io-ts-reporters";
import { isLeft } from "fp-ts/Either";
import { GaeJsCoreConfiguration } from "./schema";
import { configurationStore } from "./configurationStore";

const LOCAL_DEV_ENVIRONMENT = "development";

export const initialiseConfiguration = <T extends GaeJsCoreConfiguration>(validator: t.Type<T>): T => {
  const configuration = loadConfiguration(validator);
  configurationStore.set(configuration);
  return configuration;
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
