import _, { isString } from "lodash";
import { createLogger } from "../logging";
import { GaeJsCoreConfiguration } from "./schema";
import Path from "path";
import FileSystem from "fs";
import { ENV_VAR_CONFIG_DIR, ENV_VAR_CONFIG_ENV, ENV_VAR_CONFIG_OVERRIDES, ENV_VAR_PROJECT } from "./variables";
import { SecretsResolver } from "./secrets/secrets.resolver";

export type EnvironmentStrategy = (projectId?: string) => string | undefined;

export type ConfigValidator<T> = (data: unknown) => T;

export interface ConfigurationOptions<T extends GaeJsCoreConfiguration> {
  validator: ConfigValidator<T>;
  configDir?: string;
  projectId?: string;
  environment?: string | EnvironmentStrategy;
  overrides?: Record<string, unknown>;
}

const readFile = async (file: string) => {
  try {
    const fileContent = await FileSystem.promises.readFile(file, { encoding: "utf-8" });
    return fileContent.replace(/^\uFEFF/, "");
  } catch (e) {
    throw new Error(`Cannot read config file: ${file}: ${(e as Error).message}`);
  }
};

const readFileIfExists = async (file: string): Promise<string | null> => {
  return FileSystem.promises
    .access(file, FileSystem.constants.F_OK)
    .then(() => readFile(file))
    .catch(() => null);
};

const parseJsonSource = (source: string, content: string): Record<string, unknown> => {
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`Cannot parse config source: ${source}: ${(e as Error).message}`);
  }
};

export const getProjectId = (optionsProjectId?: string): string | undefined => {
  if (optionsProjectId) return optionsProjectId;
  if (process.env[ENV_VAR_PROJECT]) return process.env[ENV_VAR_PROJECT];
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  // TODO: Support metadata lookup - i.e. so we can support cloud functions
  return undefined;
};

const projectSuffixEnvironment: EnvironmentStrategy = (projectId?: string) => {
  if (!projectId) return undefined;
  return _.last(projectId.split("-"));
};

const getEnvironment = (
  projectId: string | undefined,
  optionsEnvironment?: string | EnvironmentStrategy
): string | undefined => {
  if (isString(optionsEnvironment)) return optionsEnvironment;
  if (process.env[ENV_VAR_CONFIG_ENV]) return process.env[ENV_VAR_CONFIG_ENV];

  const strategy = optionsEnvironment || projectSuffixEnvironment;
  return strategy(projectId);
};

const loadRawConfiguration = async <T extends GaeJsCoreConfiguration>(
  options: ConfigurationOptions<T>
): Promise<Record<string, unknown>> => {
  const logger = createLogger("loadConfiguration");

  // 1. Identify project id (if possible)
  const projectId = getProjectId(options.projectId);
  logger.info(projectId ? `Loading config for projectId ${projectId}` : "No projectId identified");

  // 2. Identify environment (if possible)
  const environment = getEnvironment(projectId, options.environment);
  logger.info(environment ? `Loading config for environment ${environment}` : "No config environment identified");

  // 3. Identify target files
  const targetFiles = ["default.json"];
  if (environment) targetFiles.push(`${environment}.json`);

  // 4. Read file config sources
  const configDir = options.configDir || process.env[ENV_VAR_CONFIG_DIR] || Path.join(process.cwd(), "config");
  logger.info(`Using config directory ${configDir}`);
  const sources: { name: string; content: Record<string, unknown> }[] = [];
  for (const targetFile of targetFiles) {
    const fullFilename = Path.join(configDir, targetFile);
    const content = await readFileIfExists(fullFilename);
    if (content) {
      const parsedContent = parseJsonSource(fullFilename, content);
      sources.push({ name: fullFilename, content: parsedContent });
    }
  }

  // 5. Add env var source if set
  const envVarContent = process.env[ENV_VAR_CONFIG_OVERRIDES];
  if (envVarContent) {
    const parsedContent = parseJsonSource(ENV_VAR_CONFIG_OVERRIDES, envVarContent);
    sources.push({ name: ENV_VAR_CONFIG_OVERRIDES, content: parsedContent });
  }

  // 6. Add overrides source if set
  if (options.overrides) {
    sources.push({ name: "options.overrides", content: options.overrides });
  }

  // 7. Merge sources in order
  logger.info(
    "Merging config sources",
    sources.map((s) => s.name)
  );
  const mergedConfig: Record<string, unknown> = { projectId, environment };
  sources.forEach((parsedConfig) => {
    _.merge(mergedConfig, parsedConfig.content);
  });

  // 6. Validate final config matches expected schema
  return options.validator(mergedConfig);
};

const resolveSecrets = async (config: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const logger = createLogger("resolveSecrets");
  logger.info("Resolving all secrets ...");
  const rawProjectId = config.secretsProjectId || config.projectId;
  const secretsProjectId = typeof rawProjectId === "string" ? rawProjectId : undefined;
  const secretsResolver = new SecretsResolver({ projectId: secretsProjectId });
  const configWithSecrets = await secretsResolver.resolveSecrets(config);
  logger.info("Secrets resolved");
  return configWithSecrets;
};

export const initialiseConfiguration = async <T extends GaeJsCoreConfiguration>(
  options: ConfigurationOptions<T>
): Promise<T> => {
  const raw = await loadRawConfiguration(options);
  const withSecrets = await resolveSecrets(raw);
  return options.validator(withSecrets);
};
