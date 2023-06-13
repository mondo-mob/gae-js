import { requestTimeoutMinutes } from "../../middleware";
import { verifyCron } from "./verify-cron";

/**
 * Util middleware to apply to GAE cron endpoints:
 * a) Verifies the request is a genuine App Engine Cron request
 * b) Extends the nodejs request timeout to 10 minutes
 *
 * @example Apply to all /crons endpoints
 * app.use("/crons", gaeJsCron);
 * app.post("/crons/poll-status", (req, res) => {...});
 */
export const gaeJsCron = [verifyCron, requestTimeoutMinutes(10)];
