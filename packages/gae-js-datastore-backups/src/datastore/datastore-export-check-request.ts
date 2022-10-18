import { z } from "zod";

export const datastoreExportCheckRequestSchema = z.object({
  backupOperationId: z.string(),
});

export type DatastoreExportCheckRequest = z.infer<typeof datastoreExportCheckRequestSchema>;
