import { Handler } from "express";
import { requiresHeader } from "@dotrun/gae-js-core";

/**
 * Middleware that verifies request is a valid App Engine Task request.
 * https://cloud.google.com/tasks/docs/creating-appengine-handlers#node.js
 */
export const verifyTask: Handler = requiresHeader("x-appengine-taskname");
