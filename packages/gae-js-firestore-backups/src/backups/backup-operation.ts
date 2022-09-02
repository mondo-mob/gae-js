import { z } from "zod";

export const backupOperationSchema = z.object({
  id: z.string(),
  type: z.enum(["EXPORT", "EXPORT_TO_BIGQUERY"]),
  operationName: z.string(),
  name: z.string(),
  collectionIds: z.array(z.string()).optional(),
  targetDataset: z.string().optional(),
  done: z.boolean().optional(),
  operationState: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  outputUriPrefix: z.string().nullable().optional(),
  errorCode: z.number().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type BackupOperation = z.infer<typeof backupOperationSchema>;
