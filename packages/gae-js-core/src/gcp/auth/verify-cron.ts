import { Handler } from "express";
import { requiresHeader } from "../../auth/requires-header";

/**
 * Middleware that verifies request is a valid App Engine Cron request.
 * https://cloud.google.com/appengine/docs/flexible/nodejs/scheduling-jobs-with-cron-yaml
 */
export const verifyCron: Handler = requiresHeader("x-appengine-cron");
