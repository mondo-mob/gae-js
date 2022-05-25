/**
 * Sets the runtime environment. - e.g. "appengine".
 */
export const ENV_VAR_RUNTIME_ENVIRONMENT = "GAEJS_ENVIRONMENT";

/**
 * Sets the GCP project the app is running in. This is most useful for local development and testing because
 * in real GCP environments the library will automatically detect the project.
 * e.g. for local dev set this to <your-project>-local and the default project suffix environment strategy
 * will identify the configuration environment as "local".
 */
export const ENV_VAR_PROJECT = "GAEJS_PROJECT";

/**
 * Set configuration directory where config files are stored.
 */
export const ENV_VAR_CONFIG_DIR = "GAEJS_CONFIG_DIR";

/**
 * Sets the configuration environment to a specific value - instead of using the environment strategy.
 */
export const ENV_VAR_CONFIG_ENV = "GAEJS_CONFIG_ENV";

/**
 * Configuration override values. These will be merged into the configuration as the last configuration source.
 * Useful for testing multiple configuration variants or can be injected into deployed environments as an alternative
 * to configuration files.
 * Must be set as stringified JSON object.
 */
export const ENV_VAR_CONFIG_OVERRIDES = "GAEJS_CONFIG_OVERRIDES";
