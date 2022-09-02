import { z } from "zod";

export const firestoreExportCheckRequestSchema = z.object({
  backupOperationId: z.string(),
});

export type FirestoreExportCheckRequest = z.infer<typeof firestoreExportCheckRequestSchema>;
