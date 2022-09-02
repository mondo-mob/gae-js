import { z } from "zod";

export const bigQueryLoadRequestSchema = z.object({
  gcsObjectPath: z.string(),
  dataset: z.string(),
  collectionId: z.string(),
});
export type BigQueryLoadRequest = z.infer<typeof bigQueryLoadRequestSchema>;
