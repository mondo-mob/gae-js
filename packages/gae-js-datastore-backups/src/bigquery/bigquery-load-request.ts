import { z } from "zod";

export const bigQueryLoadRequestSchema = z.object({
  gcsObjectPath: z.string(),
  targetDataset: z.string(),
  targetTable: z.string(),
});
export type BigQueryLoadRequest = z.infer<typeof bigQueryLoadRequestSchema>;
