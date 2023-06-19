import { Status } from "google-gax";

export interface GoogleGaxError {
  code: Status;
  details: string;
}

/**
 * Tries to guess if this looks like a Google error with the assumed type. This is because the google libs are not
 * kind to us with types or providing more concrete fields to assert on.
 *
 * @param err   Unknown error we are checking
 * @param code  Code for subtype error to check
 *
 * Also tells compile to assume the error is now of type GoogleGaxError.
 */
export const isGoogleGaxError = (err: unknown, code: Status): err is GoogleGaxError => {
  if (!isGoogleGaxErrorShape(err)) {
    return false;
  }

  return err.code === code;
};

const isGoogleGaxErrorShape = (err: any): err is GoogleGaxError =>
  typeof err?.code === "number" && typeof err?.details === "string";
