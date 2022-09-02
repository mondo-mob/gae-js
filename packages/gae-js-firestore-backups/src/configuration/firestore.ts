import { z } from "zod";
import { configurationProvider } from "@mondomob/gae-js-core";
import { gaeJsFirestoreConfigurationSchema } from "@mondomob/gae-js-firestore";
import { coreBackupConfigSchema } from "./core";

export const firestoreBackupConfigSchema = gaeJsFirestoreConfigurationSchema.merge(coreBackupConfigSchema);

export type FirestoreBackupConfiguration = z.infer<typeof firestoreBackupConfigSchema>;

export const getFirestoreBackupConfiguration = () => configurationProvider.get<FirestoreBackupConfiguration>();
