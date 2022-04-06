import { StatusCode } from "@google-cloud/firestore/build/src/status-code";
import { isFirestoreError } from "./firestore-errors";

describe("firestore-errors", () => {
  describe("isFirestoreError", () => {
    it("returns true if for ALREADY_EXISTS", () => {
      expect(isFirestoreError(ALREADY_EXISTS_ERROR, StatusCode.ALREADY_EXISTS)).toBe(true);
    });

    it("returns false if code does not match in error", () => {
      expect(isFirestoreError(ALREADY_EXISTS_ERROR, StatusCode.NOT_FOUND)).toBe(false);
    });

    it("returns false if shape of object does not match expected firestore error", () => {
      expect(isFirestoreError({ code: ALREADY_EXISTS_ERROR.code }, StatusCode.ALREADY_EXISTS)).toBe(false);
    });

    it("returns false if error is string", () => {
      expect(isFirestoreError("some error", StatusCode.ALREADY_EXISTS)).toBe(false);
    });

    it("returns false if error is undefined", () => {
      expect(isFirestoreError(undefined, StatusCode.ALREADY_EXISTS)).toBe(false);
    });
  });
});

const ALREADY_EXISTS_ERROR = {
  code: 6,
  details:
    'entity already exists: app: "dev~firestore-tests"\npath <\n  Element {\n    type: "repository-items"\n    name: "123"\n  }\n>\n',
  metadata: {
    "content-type": ["application/grpc"],
  },
  note: "Exception occurred in retry method that was not classified as transient",
};
