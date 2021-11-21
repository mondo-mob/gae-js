import { runningOnGcp } from "./environment";

describe("environment", () => {
  describe("runningOnGcp", () => {
    beforeEach(() => {
      delete process.env.GAEJS_ENVIRONMENT;
      delete process.env.K_SERVICE;
      delete process.env.K_REVISION;
    });

    it("returns false by default ", () => {
      expect(runningOnGcp()).toBeFalsy();
    });

    it("returns true when GAEJS_ENVIRONMENT set to appengine", () => {
      expect(runningOnGcp()).toBeFalsy();
      process.env.GAEJS_ENVIRONMENT = "appengine";
      expect(runningOnGcp()).toBeTruthy();
    });

    it("returns false when GAEJS_ENVIRONMENT not set to appengine", () => {
      expect(runningOnGcp()).toBeFalsy();
      process.env.GAEJS_ENVIRONMENT = "something else";
      expect(runningOnGcp()).toBeFalsy();
    });

    it("returns true when K_SERVICE and K_REVISION set", () => {
      expect(runningOnGcp()).toBeFalsy();
      process.env.K_SERVICE = "service";
      process.env.K_REVISION = "revision";
      expect(runningOnGcp()).toBeTruthy();
    });
  });
});
