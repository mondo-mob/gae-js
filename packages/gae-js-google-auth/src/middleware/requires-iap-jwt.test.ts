import express from "express";
import { LoginTicket, OAuth2Client, TokenPayload } from "google-auth-library";
import request from "supertest";
import { IAP_JWT_HEADER, IapJwtVerificationOptions, requiresIapJwt } from "./requires-iap-jwt";

describe("requiresIapJwt", () => {
  beforeEach(() => {
    mockGetKeys();
  });

  it("is disabled for non-GCP deployed environment by default", async () => {
    const app = initEndpointWithRequiresIapJwt();
    await request(app).get("/message").expect(200, "MESSAGE");
  });

  it("succeeds for valid JWT token", async () => {
    const verifySpy = mockVerifyIdToken();
    const app = initEndpointWithRequiresIapJwt({
      disableForNonGcpEnvironment: false,
    });

    await request(app).get("/message").set(IAP_JWT_HEADER, "the-token").expect(200, "MESSAGE");

    expect(verifySpy).toHaveBeenCalledWith(
      "the-token",
      { key1: "keyabc", key2: "keydef" },
      ["http://example.com"],
      ["https://cloud.google.com/iap"]
    );
  });

  it("passes audience to verification when audience option supplied", async () => {
    const verifySpy = mockVerifyIdToken();
    const app = initEndpointWithRequiresIapJwt({
      audience: "expected-audience",
      disableForNonGcpEnvironment: false,
    });

    await request(app).get("/message").set(IAP_JWT_HEADER, "the-token").expect(200, "MESSAGE");

    expect(verifySpy).toHaveBeenCalledWith(
      "the-token",
      { key1: "keyabc", key2: "keydef" },
      ["http://example.com"],
      ["https://cloud.google.com/iap"]
    );
  });

  it("fails when no token header", async () => {
    const app = initEndpointWithRequiresIapJwt({
      disableForNonGcpEnvironment: false,
    });
    await request(app).get("/message").expect(403);
  });

  it("fails when token header empty", async () => {
    const app = initEndpointWithRequiresIapJwt({
      disableForNonGcpEnvironment: false,
    });
    await request(app).get("/message").set(IAP_JWT_HEADER, "").expect(403);
  });

  it("fails when error thrown verifying id token", async () => {
    mockVerifyIdTokenThrowsError();
    const app = initEndpointWithRequiresIapJwt({
      disableForNonGcpEnvironment: false,
    });

    await request(app).get("/message").set(IAP_JWT_HEADER, "the-token").expect(403);
  });
});

const initEndpointWithRequiresIapJwt = (opts?: Partial<IapJwtVerificationOptions>) => {
  const app = express();
  app.get(
    "/message",
    requiresIapJwt({
      audience: "http://example.com",
      ...opts,
    }),
    (req, res) => res.send("MESSAGE")
  );
  return app;
};

const mockGetKeys = () =>
  jest.spyOn(OAuth2Client.prototype, "getIapPublicKeys").mockImplementation(async () => ({
    pubkeys: { key1: "keyabc", key2: "keydef" },
  }));

const mockVerifyIdToken = (payloadOverrides: Partial<TokenPayload> = {}) =>
  jest.spyOn(OAuth2Client.prototype, "verifySignedJwtWithCertsAsync").mockImplementation(
    async () =>
      new LoginTicket("envelope", {
        ...SAMPLE_SUCCESS_PAYLOAD,
        ...payloadOverrides,
      })
  );

const mockVerifyIdTokenThrowsError = () =>
  jest.spyOn(OAuth2Client.prototype, "verifySignedJwtWithCertsAsync").mockImplementation(() => {
    throw new Error("Test error");
  });

// Taken from https://cloud.google.com/pubsub/docs/push#jwt_format
const SAMPLE_SUCCESS_PAYLOAD: Readonly<TokenPayload> = {
  aud: "https://example.com",
  azp: "113774264463038321964",
  email: "gae-gcp@appspot.gserviceaccount.com",
  sub: "113774264463038321964",
  email_verified: true,
  exp: 1550185935,
  iat: 1550182335,
  iss: "https://cloud.google.com/iap",
};
