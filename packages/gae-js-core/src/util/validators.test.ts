import { validate, validateFound, validateArrayNotEmpty, validateNotNil } from "./validators";
import { BadRequestError, NotFoundError } from "../error";

describe("validators", () => {
  describe("validateFound", () => {
    it("returns instance when not null", () => {
      const instance = {};

      expect(validateFound("MyType", "myId", instance)).toBe(instance);
    });

    it("throws not found when null", () => {
      expect(() => validateFound("MyType", "myId", null)).toThrow(
        new NotFoundError("MyType not found for identifier: myId")
      );
    });
  });

  describe("validate", () => {
    it("does not error when expression is true", () => {
      validate(500 > 1, "This would be strange if it failed");
    });

    it("throws validation error when expression is false", () => {
      expect(() => validate(500 < 1, "That ain't right")).toThrow(new BadRequestError("That ain't right"));
    });

    it("throws custom error when expression is false and custom error class supplied", () => {
      expect(() => validate(500 < 1, "That ain't right", MyCustomError)).toThrow(new MyCustomError("That ain't right"));
    });
  });

  describe("validateNotNil", () => {
    it("returns instance when not null", () => {
      const instance = {};

      expect(validateNotNil(instance, "Can't be nil")).toBe(instance);
    });

    it("returns source when source is falsey but not undefined or null", () => {
      expect(validateNotNil(0, "Can't be nil")).toBe(0);
      expect(validateNotNil("", "Can't be nil")).toBe("");
    });

    it("throws validation error when null", () => {
      expect(() => validateNotNil(null, "Can't be nil")).toThrow(new BadRequestError("Can't be nil"));
    });

    it("throws validation error when undefined", () => {
      expect(() => validateNotNil(undefined, "Can't be nil")).toThrow(new BadRequestError("Can't be nil"));
    });
  });

  describe("validateArrayNotEmpty", () => {
    it("returns array when not empty", () => {
      const instance = ["one"];
      expect(validateArrayNotEmpty(instance, "Can't be nil")).toBe(instance);
    });

    it("throws validation error when empty array", () => {
      expect(() => validateArrayNotEmpty([], "Can't be empty")).toThrow(new BadRequestError("Can't be empty"));
    });

    it("throws validation error when null", () => {
      expect(() => validateArrayNotEmpty(null, "Can't be empty")).toThrow(new BadRequestError("Can't be empty"));
    });

    it("throws validation error when undefined", () => {
      expect(() => validateArrayNotEmpty(undefined, "Can't be empty")).toThrow(new BadRequestError("Can't be empty"));
    });
  });
});

class MyCustomError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}
