import { requestTimeoutMinutes } from "@dotrun/gae-js-core";
import { verifyTask } from "./verify-task";

/**
 * Util middleware to apply to GAE task endpoints:
 * a) Verifies the request is a genuine App Engine Task request
 * b) Extends the nodejs request timeout to 10 minutes
 *
 * @example Apply to all /tasks endpoints
 * app.use("/tasks", gaeJsTask);
 * app.post("/tasks/poll-status", (req, res) => {...});
 */
export const gaeJsTask = [verifyTask, requestTimeoutMinutes(10)];
