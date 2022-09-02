import { Router } from "express";
import { asyncHandler } from "@mondomob/gae-js-core";
import { firestoreExportServiceProvider } from "./firestore-export.service";
import { validateRequest } from "../util/types";
import { firestoreExportRequestSchema } from "./firestore-export-request";

export const firestoreBackupCronRoutes = (router = Router()): Router => {
  router.get(
    "/backups/firestore",
    asyncHandler(async (req, res) => {
      const options = validateRequest(firestoreExportRequestSchema, req.query);
      const firestoreExportService = firestoreExportServiceProvider.get();
      const backupOperation = await firestoreExportService.startExport(options);
      await firestoreExportService.queueUpdateExportStatus({ backupOperationId: backupOperation.id });
      return res.send(`Backup operation ${backupOperation.id} started`);
    })
  );

  return router;
};
