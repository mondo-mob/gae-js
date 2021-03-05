/**
 * Consumers must set the GCP_ENVIRONMENT variable in deployed environments.
 * e.g. for GAE in app.yaml
 *
 * @example
 * env_variables:
 *   GCP_ENVIRONMENT: appengine
 */
export const isGcpEnvironment = (): boolean => !!process.env.GCP_ENVIRONMENT;
