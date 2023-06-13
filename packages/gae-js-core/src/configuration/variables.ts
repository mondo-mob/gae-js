/**
 * Sets the runtime environment. - e.g. "appengine".
 */
export const ENV_VAR_RUNTIME_ENVIRONMENT = "GAEJS_ENVIRONMENT";

/**
 * Set configuration directory where config files are stored.
 */
export const ENV_VAR_CONFIG_DIR = "GAEJS_CONFIG_DIR";

/**
 * Configuration override values. These will be merged into the configuration as the last configuration source.
 * Useful for testing multiple configuration variants or can be injected into deployed environments as an alternative
 * to configuration files.
 * Must be set as stringified JSON object.
 */
export const ENV_VAR_CONFIG_OVERRIDES = "GAEJS_CONFIG_OVERRIDES";
