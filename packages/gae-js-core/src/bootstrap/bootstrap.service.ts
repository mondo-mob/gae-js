import { Bootstrapper } from "./bootstrapper";
import { createLogger } from "../logging";

const logger = createLogger("bootstrap-service");

export const bootstrap = async (bootstrappers: Bootstrapper[]) => {
  logger.info(`Bootstrap started with ${bootstrappers.length} bootstrappers ...`);
  for (const bootstrapper of bootstrappers) {
    await bootstrapper();
  }
  logger.info("Bootstrap finished");
};
