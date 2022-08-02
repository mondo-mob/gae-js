import { z } from "zod";

export const gaeJsCoreConfigurationSchema = z.object({
  projectId: z.string(),
  environment: z.string().optional(),
  host: z.string().optional(),
  location: z.string().optional(),
  secretsProjectId: z.string().optional(),
});

export type GaeJsCoreConfiguration = z.infer<typeof gaeJsCoreConfigurationSchema>;
