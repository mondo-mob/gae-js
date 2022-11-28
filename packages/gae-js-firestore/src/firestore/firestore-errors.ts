import { StatusCode } from "@google-cloud/firestore/build/src/status-code";

export interface FirestoreError {
  code: StatusCode;
  details: string;
}

/**
 * Tries to guess if this looks like a Firestore error with the assumed type. This is because the firestore lib is not
 * kind to us with types or providing more concrete fields to assert on.
 *
 * @param err   Unknown error we are checking
 * @param code  Code for subtype error to check
 *
 * Also tells compile to assume the error is now of type FirestoreError.
 */
export const isFirestoreError = (err: unknown, code: StatusCode): err is FirestoreError => {
  if (!isFirestoreErrorShape(err)) {
    return false;
  }

  return err.code === code;
};

const isFirestoreErrorShape = (err: any): err is FirestoreError =>
  typeof err?.code === "number" && typeof err?.details === "string";
