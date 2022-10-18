import { z } from "zod";
import { oneOrManyStrings } from "../util/types";

export const datastoreExportRequestSchema = z.object({
  type: z.enum(["EXPORT", "EXPORT_TO_BIGQUERY"]),
  name: z.string().optional(),
  kinds: oneOrManyStrings,
  targetDataset: z.string().optional(),
});
export type DatastoreExportRequest = z.infer<typeof datastoreExportRequestSchema>;
