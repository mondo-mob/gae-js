import { Handler } from "express";
import { loggingRequestStorage } from "../logging";
import { runWithRequestStorage } from "../request-storage";

export const requestAsyncStorage: Handler = (req, res, next) => {
  runWithRequestStorage(() => {
    try {
      if ((req as any).log) {
        loggingRequestStorage.set((req as any).log);
      }
      next();
    } catch (e) {
      next(e);
    }
  });
};
