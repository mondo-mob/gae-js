import { StatusCode } from "@google-cloud/firestore/build/src/status-code";

interface FirestoreError {
  code: number;
  details: string;
}

export const isFirestoreError = (err: unknown, type: StatusCode) => {
  if (!isFirestoreErrorShape(err)) {
    return false;
  }

  return (err as FirestoreError).code === type;
};

const isFirestoreErrorShape = (err: any) => err?.code && err?.details;
