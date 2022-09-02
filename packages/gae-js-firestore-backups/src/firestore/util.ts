import * as protos from "@google-cloud/firestore/types/protos/firestore_admin_v1_proto_api";
import { LROperation } from "google-gax";
import { google } from "@google-cloud/firestore/build/protos/firestore_v1_proto_api";
import ITimestamp = google.protobuf.ITimestamp;
import { BackupOperation } from "../backups";

type ExportMetadata = protos.google.firestore.admin.v1.IExportDocumentsMetadata;
type ExportOperation = LROperation<protos.google.firestore.admin.v1.IExportDocumentsResponse, ExportMetadata>;

export const toISOTime = (timestamp?: ITimestamp | null): string | null => {
  if (!timestamp || !timestamp.seconds) return null;
  return new Date(Number(timestamp.seconds) * 1000).toISOString();
};

export const mergeExportOperation = (
  backupOperation: BackupOperation,
  exportOperation: ExportOperation
): BackupOperation => {
  const meta = exportOperation.metadata as ExportMetadata;
  return {
    ...backupOperation,
    done: exportOperation.done || false,
    collectionIds: meta.collectionIds || [],
    outputUriPrefix: meta.outputUriPrefix || null,
    operationState: meta.operationState || null,
    startTime: toISOTime(meta.startTime),
    endTime: toISOTime(meta.endTime),
    errorCode: exportOperation.error?.code || null,
    errorMessage: exportOperation.error?.message || null,
  };
};
