import FileSystem from "fs";
import { merge } from "lodash";
import Path from "path";
import { createLogger } from "../logging";
import { ENV_VAR_CONFIG_DIR, ENV_VAR_CONFIG_OVERRIDES } from "./variables";
import { DataValidator } from "../util/data";

export type ConfigValidator<T> = DataValidator<T>;

export type ConfigValueResolver = (config: Record<string, unknown>) => Promise<Record<string, unknown>>;

export type ConfigEnvironment = {
  defaultProps?: Record<string, unknown>;
  files?: string[];
};

export type ConfigEnvironmentResolver = () => ConfigEnvironment | Promise<ConfigEnvironment>;

export interface ConfigurationOptions<T> {
  environmentResolver: ConfigEnvironmentResolver;
  validator: ConfigValidator<T>;
  configDir?: string;
  overrides?: Record<string, unknown>;
  valueResolvers?: ConfigValueResolver[];
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

const loadRawConfiguration = async <T>(options: ConfigurationOptions<T>): Promise<Record<string, unknown>> => {
  const logger = createLogger("loadConfiguration");

  // 1. Identify environment
  const environment = await options.environmentResolver();

  // 2. Identify target files
  const targetFiles = ["default.json", ...(environment.files ?? [])];

  // 3. Read file config sources
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

  // 4. Add env var source if set
  const envVarContent = process.env[ENV_VAR_CONFIG_OVERRIDES];
  if (envVarContent) {
    const parsedContent = parseJsonSource(ENV_VAR_CONFIG_OVERRIDES, envVarContent);
    sources.push({ name: ENV_VAR_CONFIG_OVERRIDES, content: parsedContent });
  }

  // 5. Add overrides source if set
  if (options.overrides) {
    sources.push({ name: "options.overrides", content: options.overrides });
  }

  // 6. Merge sources in order
  logger.info(
    "Merging config sources",
    sources.map((s) => s.name)
  );
  const mergedConfig: Record<string, unknown> = { ...environment.defaultProps };
  sources.forEach((parsedConfig) => {
    merge(mergedConfig, parsedConfig.content);
  });

  return mergedConfig;
};

export const loadConfiguration = async <T>(options: ConfigurationOptions<T>): Promise<T> => {
  let config = await loadRawConfiguration(options);
  for (const resolver of options.valueResolvers ?? []) {
    config = await resolver(config);
  }
  return options.validator(config);
};
