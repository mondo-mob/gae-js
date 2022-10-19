import { Router } from "express";
import { asyncHandler, createLogger } from "@mondomob/gae-js-core";
import { bigQueryFirestoreImportServiceProvider, bigQueryImportTaskRoutes } from "../bigquery";
import { firestoreExportCheckRequestSchema } from "./firestore-export-check-request";
import { firestoreExportServiceProvider } from "./firestore-export.service";
import { validateRequest } from "../util/types";

export const TASK_FIRESTORE_EXPORT_CHECK = "/backups/firestore-export-check";

export const firestoreBackupTaskRoutes = (router = Router()): Router => {
  const logger = createLogger("firestoreBackupTaskRoutes");

  router.post(
    TASK_FIRESTORE_EXPORT_CHECK,
    asyncHandler(async (req, res) => {
      const payload = validateRequest(firestoreExportCheckRequestSchema, req.body);
      const backupOperation = await firestoreExportServiceProvider.get().updateOperation(payload.backupOperationId);

      if (!backupOperation.done) {
        await firestoreExportServiceProvider.get().queueUpdateExportStatus(payload);
        return res.send(`Firestore export ${backupOperation.id} hasn't finished yet, will check again later`);
      }

      logger.info("Firestore export complete");
      if (backupOperation.type === "EXPORT_TO_BIGQUERY") {
        await bigQueryFirestoreImportServiceProvider.get().queueImportFromBackup(backupOperation);
        return res.send("Firestore export complete. BigQuery load queued...");
      }
      return res.send("Firestore export complete");
    })
  );

  bigQueryImportTaskRoutes(router);

  return router;
};
