import { ENV_VAR_RUNTIME_ENVIRONMENT } from "../../configuration/variables";

/**
 * This checks for the cloud function reserved environment variables K_SERVICE and K_REVISION
 * These are set in the cloud environment so make sure you don't set these locally
 */
const onCloudFunctions = (): boolean => !!process.env.K_SERVICE && !!process.env.K_REVISION;

const onAppEngine = (): boolean => process.env[ENV_VAR_RUNTIME_ENVIRONMENT] === "appengine";

/**
 * Determines whether the code is running on GCP (vs locally).
 *
 * Cloud Functions: Checks for existence of K_SERVICE and K_REVISION reserved env variables
 * AppEngine: Consumers must set the GAEJS_ENVIRONMENT variable in deployed GCP environments.
 * e.g. for GAE add this in app.yaml
 *
 * @example
 * env_variables:
 *   GAEJS_ENVIRONMENT: appengine
 */
export const runningOnGcp = (): boolean => {
  return onAppEngine() || onCloudFunctions();
};
