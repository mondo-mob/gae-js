import { GrpcStatus } from "@google-cloud/firestore";
import { isFirestoreError } from "./firestore-errors";

describe("firestore-errors", () => {
  describe("isFirestoreError", () => {
    it("returns true if for ALREADY_EXISTS", () => {
      expect(isFirestoreError(ALREADY_EXISTS_ERROR, GrpcStatus.ALREADY_EXISTS)).toBe(true);
    });

    it("returns false if code does not match in error", () => {
      expect(isFirestoreError(ALREADY_EXISTS_ERROR, GrpcStatus.NOT_FOUND)).toBe(false);
    });

    it("returns false if shape of object does not match expected firestore error", () => {
      expect(isFirestoreError({ code: ALREADY_EXISTS_ERROR.code }, GrpcStatus.ALREADY_EXISTS)).toBe(false);
    });

    it("returns false if error is string", () => {
      expect(isFirestoreError("some error", GrpcStatus.ALREADY_EXISTS)).toBe(false);
    });

    it("returns false if error is undefined", () => {
      expect(isFirestoreError(undefined, GrpcStatus.ALREADY_EXISTS)).toBe(false);
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
