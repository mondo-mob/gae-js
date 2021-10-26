/**
 * @deprecated Use runningOnGcp() instead
 */
export const isGcpEnvironment = (): boolean => runningOnGcp();

/**
 * Determines whether the code is running on GCP (vs locally).
 * For this to work consumers must set the GAEJS_ENVIRONMENT variable in deployed GCP environments.
 * e.g. for GAE add this in app.yaml
 *
 * @example
 * env_variables:
 *   GAEJS_ENVIRONMENT: appengine
 */
export const runningOnGcp = (): boolean => {
  const onGcp = process.env.GAEJS_ENVIRONMENT === "appengine";

  if (!onGcp && !!process.env.GCP_ENVIRONMENT) {
    console.warn("Usage of GCP_ENVIRONMENT variable deprecated. Please use GAEJS_ENVIRONMENT instead.");
    return true;
  }

  return onGcp;
};
