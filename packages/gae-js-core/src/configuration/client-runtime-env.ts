import { Handler } from "express";
import * as rcloadenv from "@google-cloud/rcloadenv";
import { isGcpEnvironment } from "../util";

/**
 * Middleware to provide runtime configuration for static clients such as create-react-app SPAs.
 * Allows a single build to be deployed to multiple environments.
 *
 * Fetches configuration from Google Cloud Runtime Config API and returns a javascript
 * payload to populate window.client_env on the client. Client code can then lookup config
 * values using <code>window.client_env</code>
 *
 * All values within the specified configuration are returned.
 * Values are returned to the client so must not contain any secrets/password.
 *
 * @example On Server
 *   app.use("/client-env.js", clientRuntimeEnv("web-client-config"))
 *
 * @example On Client:
 *   <script src="%PUBLIC_URL%/client-env.js"></script>
 *
 * @param configName the name of the runtime configuration available in Runtime Config API
 */
export const clientRuntimeEnv = (configName: string): Handler => {
  const loadPromise = isGcpEnvironment() ? rcloadenv.getAndApply(configName, {}) : Promise.resolve({});

  return async (req, res, next) => {
    if (isGcpEnvironment()) {
      try {
        const variables = await loadPromise;
        res.set("Content-Type", "application/javascript");
        res.send(`window.client_env = ${JSON.stringify(variables)}`);
      } catch (e) {
        next(e);
      }
    }
    next();
  };
};
