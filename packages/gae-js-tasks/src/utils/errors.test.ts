import { Status } from "google-gax";
import { isGoogleGaxError } from "./errors";

describe("errors", () => {
  describe("isFirestoreError", () => {
    it("returns true if for ALREADY_EXISTS", () => {
      expect(isGoogleGaxError(ALREADY_EXISTS_ERROR, Status.ALREADY_EXISTS)).toBe(true);
    });

    it("returns false if code does not match in error", () => {
      expect(isGoogleGaxError(ALREADY_EXISTS_ERROR, Status.NOT_FOUND)).toBe(false);
    });

    it("returns false if shape of object does not match expected firestore error", () => {
      expect(isGoogleGaxError({ code: ALREADY_EXISTS_ERROR.code }, Status.ALREADY_EXISTS)).toBe(false);
    });

    it("returns false if error is string", () => {
      expect(isGoogleGaxError("some error", Status.ALREADY_EXISTS)).toBe(false);
    });

    it("returns false if error is undefined", () => {
      expect(isGoogleGaxError(undefined, Status.ALREADY_EXISTS)).toBe(false);
    });
  });
});

const ALREADY_EXISTS_ERROR = {
  code: 6,
  details: "entity already exists",
};
