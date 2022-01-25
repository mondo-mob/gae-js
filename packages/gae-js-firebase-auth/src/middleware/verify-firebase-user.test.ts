import express, { ErrorRequestHandler, Handler } from "express";
import admin from "firebase-admin";
import { verifyFirebaseUser, VerifyOptions } from "./verify-firebase-user";
import request from "supertest";
import { getRequestStore, requestAsyncStorage, UnauthorisedError, userRequestStorage } from "@mondomob/gae-js-core";

const emulatorSignup = async (email: string): Promise<any> => {
  const emulatorResponse = await request("http://localhost:9099")
    .post("/identitytoolkit.googleapis.com/v1/accounts:signUp?key=123")
    .send({ email, password: "password", returnSecureToken: true });
  return emulatorResponse.body;
};

let requestStorage: any;
let error: any;
const exposeRequestStorage: Handler = (req, res, next) => {
  requestStorage = getRequestStore();
  next();
};
const exposeErrors: ErrorRequestHandler = (err, req, res, next) => {
  error = err;
  next();
};
const firebaseAdmin = admin.initializeApp({ projectId: "auth-tests" });

const initApp = (mwOptions?: VerifyOptions) => {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
  const app = express();
  app.use(requestAsyncStorage);
  app.use(verifyFirebaseUser(firebaseAdmin, mwOptions));
  app.use(exposeRequestStorage);
  app.use(exposeErrors);
  app.get("/", (req, res) => res.send("OK"));
  return app;
};

describe("verifyFirebaseUser", () => {
  beforeEach(() => {
    error = undefined;
  });

  describe("default user converter", () => {
    const app = initApp();

    it("ignores request if no authorization header", async () => {
      await request(app).get("/");

      expect(userRequestStorage.get()).toBeNull();
      expect(error).toBeUndefined();
    });

    it("verifies valid token and populates user storage", async () => {
      const email = `john${Date.now()}@example.com`;
      const { idToken } = await emulatorSignup(email);

      await request(app).get("/").set("Authorization", `Bearer ${idToken}`);

      const user = requestStorage?._USER;
      expect(user).not.toBeNull();
      expect(user?.email).toEqual(email);
      expect(error).toBeUndefined();
    });

    it("rejects fake token with unauthorised", async () => {
      await request(app).get("/").set("Authorization", "Bearer XYZ");

      expect(userRequestStorage.get()).toBeNull();
      expect(error).toBeInstanceOf(UnauthorisedError);
    });

    it("rejects real but invalid token with unauthorised", async () => {
      const expired =
        "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJuYW1lIjoiIiwicGljdHVyZSI6IiIsInJvbGVzIjpbIlVTRVIiXSwiZW1haWwiOiJtYXJ0aW5AZXhhbXBsZS5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImF1dGhfdGltZSI6MTYxMzM4MDk2MiwidXNlcl9pZCI6Im92ZncxY2l0N1VVeGJoTzZlUVlmZFRPVW1id0kiLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbIm1hcnRpbkBleGFtcGxlLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn0sImlhdCI6MTYxMzM4MDk2MiwiZXhwIjoxNjEzMzg0NTYyLCJhdWQiOiJnYWUtanMtaW1wbC1sb2NhbCIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9nYWUtanMtaW1wbC1sb2NhbCIsInN1YiI6Im92ZncxY2l0N1VVeGJoTzZlUVlmZFRPVW1id0kifQ.";
      await request(app).get("/").set("Authorization", `Bearer ${expired}`);

      expect(userRequestStorage.get()).toBeNull();
      expect(error).toBeInstanceOf(UnauthorisedError);
    });
  });
  describe("custom user converter", () => {
    const app = initApp({
      userConverter: (idToken) => {
        return {
          id: idToken.uid,
          email: idToken.email,
          roles: idToken.roles || [],
          email_verified: !!idToken.email_verified,
          auth_time: idToken.auth_time,
        };
      },
    });

    it("ignores request if no authorization header", async () => {
      await request(app).get("/");

      expect(userRequestStorage.get()).toBeNull();
      expect(error).toBeUndefined();
    });

    it("verifies valid token and populates user storage with custom mapped user", async () => {
      const email = `john${Date.now()}@example.com`;
      const { idToken } = await emulatorSignup(email);

      await request(app).get("/").set("Authorization", `Bearer ${idToken}`);

      const user = requestStorage?._USER;
      expect(user).not.toBeNull();
      expect(user?.email).toEqual(email);
      expect(user?.email_verified).toBe(false);
      expect(typeof user?.auth_time).toBe("number");
      expect(error).toBeUndefined();
    });
  });
});
