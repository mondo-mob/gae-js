import { Router } from "express";
import { asyncHandler } from "@mondomob/gae-js-core";
import { bigQueryFirestoreImportServiceProvider } from "./bigquery-firestore-import.service";
import { validateRequest } from "../util/types";
import { bigQueryLoadRequestSchema } from "./bigquery-load-request";

export const TASK_BIGQUERY_LOAD_COLLECTION = "/backups/bigquery-load-collection";

export const bigQueryImportTaskRoutes = (router = Router()): Router => {
  router.post(
    TASK_BIGQUERY_LOAD_COLLECTION,
    asyncHandler(async (req, res) => {
      const options = validateRequest(bigQueryLoadRequestSchema, req.body);
      const result = await bigQueryFirestoreImportServiceProvider
        .get()
        .importCollection(options.gcsObjectPath, options.targetDataset, options.targetTable);
      res.send(result);
    })
  );

  return router;
};
