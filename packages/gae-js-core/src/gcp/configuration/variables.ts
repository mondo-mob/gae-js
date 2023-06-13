/**
 * Sets the GCP project the app is running in. This is most useful for local development and testing because
 * in real GCP environments the library will automatically detect the project.
 * e.g. for local dev set this to <your-project>-local and the default project suffix environment strategy
 * will identify the configuration environment as "local".
 */
export const ENV_VAR_PROJECT = "GAEJS_PROJECT";

/**
 * Sets the configuration environment to a specific value - instead of using the environment strategy.
 */
export const ENV_VAR_CONFIG_ENV = "GAEJS_CONFIG_ENV";
