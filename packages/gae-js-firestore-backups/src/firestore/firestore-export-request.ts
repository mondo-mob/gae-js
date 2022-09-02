import { z } from "zod";
import { oneOrManyStrings } from "../util/types";

export const firestoreExportRequestSchema = z.object({
  type: z.enum(["EXPORT", "EXPORT_TO_BIGQUERY"]),
  name: z.string().optional(),
  collectionIds: oneOrManyStrings,
  targetDataset: z.string().optional(),
});
export type FirestoreExportRequest = z.infer<typeof firestoreExportRequestSchema>;
