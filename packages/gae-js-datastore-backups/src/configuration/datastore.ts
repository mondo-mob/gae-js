import { z } from "zod";
import { configurationProvider } from "@mondomob/gae-js-core";
import { gaeJsDatastoreConfigurationSchema } from "@mondomob/gae-js-datastore";
import { coreBackupConfigSchema } from "./core";

export const gaeJsDatastoreBackupConfigSchema = gaeJsDatastoreConfigurationSchema.merge(coreBackupConfigSchema);

export type GaeJsDatastoreBackupConfiguration = z.infer<typeof gaeJsDatastoreBackupConfigSchema>;

export const getDatastoreBackupConfiguration = () => configurationProvider.get<GaeJsDatastoreBackupConfiguration>();
