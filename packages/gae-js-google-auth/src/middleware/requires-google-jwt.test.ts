import express from "express";
import { LoginTicket, OAuth2Client, TokenPayload } from "google-auth-library";
import request from "supertest";
import { JwtVerificationOptions, requiresGoogleJwt } from "./requires-google-jwt";

describe("requiresGoogleJwt", () => {
  it("is disabled for non-GCP deployed environment by default", async () => {
    const app = initEndpointWithRequiresGoogleJwt();
    await request(app).get("/message").expect(200, "MESSAGE");
  });

  it("succeeds for valid JWT token", async () => {
    const verifyIdTokenSpy = mockVerifyIdToken();
    const app = initEndpointWithRequiresGoogleJwt({
      disableForNonGcpEnvironment: false,
    });

    await request(app).get("/message").set("Authorization", "Bearer the-token").expect(200, "MESSAGE");

    expect(verifyIdTokenSpy).toHaveBeenCalledWith({
      idToken: "the-token",
    });
  });

  it("passes audience to verification when audience option supplied", async () => {
    const verifyIdTokenSpy = mockVerifyIdToken();
    const app = initEndpointWithRequiresGoogleJwt({
      audience: "expected-audience",
      disableForNonGcpEnvironment: false,
    });

    await request(app).get("/message").set("Authorization", "Bearer the-token").expect(200, "MESSAGE");

    expect(verifyIdTokenSpy).toHaveBeenCalledWith({
      idToken: "the-token",
      audience: ["expected-audience"],
    });
  });

  it("succeeds for valid JWT token matching email", async () => {
    mockVerifyIdToken({
      email: "foo@bar.com",
    });
    const app = initEndpointWithRequiresGoogleJwt({
      email: "foo@bar.com",
      disableForNonGcpEnvironment: false,
    });

    await request(app).get("/message").set("Authorization", "Bearer the-token").expect(200, "MESSAGE");
  });

  it("succeeds for valid JWT token matching one email in array", async () => {
    mockVerifyIdToken({
      email: "foo@bar.com",
    });
    const app = initEndpointWithRequiresGoogleJwt({
      email: ["something@else.com", "foo@bar.com"],
      disableForNonGcpEnvironment: false,
    });

    await request(app).get("/message").set("Authorization", "Bearer the-token").expect(200, "MESSAGE");
  });

  it("fails when email does not match any of the expected", async () => {
    mockVerifyIdToken({
      email: "nomatch@bar.com",
    });
    const app = initEndpointWithRequiresGoogleJwt({
      email: ["something@else.com", "foo@bar.com"],
      disableForNonGcpEnvironment: false,
    });

    await request(app).get("/message").set("Authorization", "Bearer the-token").expect(403);
  });

  it("fails when issuer is not https://accounts.google.com", async () => {
    mockVerifyIdToken({
      iss: "https://foo.bar",
    });
    const app = initEndpointWithRequiresGoogleJwt({
      disableForNonGcpEnvironment: false,
    });

    await request(app).get("/message").set("Authorization", "Bearer the-token").expect(403);
  });

  it("fails when email_verified is false", async () => {
    mockVerifyIdToken({
      email_verified: false,
    });
    const app = initEndpointWithRequiresGoogleJwt({
      disableForNonGcpEnvironment: false,
    });

    await request(app).get("/message").set("Authorization", "Bearer the-token").expect(403);
  });

  it("fails when email_verified is undefined", async () => {
    mockVerifyIdToken({
      email_verified: undefined,
    });
    const app = initEndpointWithRequiresGoogleJwt({
      disableForNonGcpEnvironment: false,
    });

    await request(app).get("/message").set("Authorization", "Bearer the-token").expect(403);
  });

  it("fails when no Authorization header", async () => {
    const app = initEndpointWithRequiresGoogleJwt({
      disableForNonGcpEnvironment: false,
    });
    await request(app).get("/message").expect(403);
  });

  it("fails when no Bearer token in Authorization header", async () => {
    const app = initEndpointWithRequiresGoogleJwt({
      disableForNonGcpEnvironment: false,
    });
    await request(app).get("/message").set("Authorization", "Basic foo:bar").expect(403);
    await request(app).get("/message").set("Authorization", "Bearer").expect(403);
  });

  it("fails when error thrown verifying id token", async () => {
    mockVerifyIdTokenThrowsError();
    const app = initEndpointWithRequiresGoogleJwt({
      disableForNonGcpEnvironment: false,
    });

    await request(app).get("/message").set("Authorization", "Bearer the-token").expect(403);
  });

  it("fails when undefined token returned", async () => {
    mockVerifyIdTokenUndefinedPayload();
    const app = initEndpointWithRequiresGoogleJwt({
      disableForNonGcpEnvironment: false,
    });

    await request(app).get("/message").set("Authorization", "Bearer the-token").expect(403);
  });
});

const initEndpointWithRequiresGoogleJwt = (opts?: JwtVerificationOptions) => {
  const app = express();
  app.get("/message", requiresGoogleJwt(opts), (req, res) => res.send("MESSAGE"));
  return app;
};

const mockVerifyIdToken = (payloadOverrides: Partial<TokenPayload> = {}) =>
  jest.spyOn(OAuth2Client.prototype, "verifyIdToken").mockImplementation(
    async () =>
      new LoginTicket("envelope", {
        ...SAMPLE_SUCCESS_PAYLOAD,
        ...payloadOverrides,
      })
  );

const mockVerifyIdTokenUndefinedPayload = () =>
  jest.spyOn(OAuth2Client.prototype, "verifyIdToken").mockImplementation(async () => new LoginTicket());

const mockVerifyIdTokenThrowsError = () =>
  jest.spyOn(OAuth2Client.prototype, "verifyIdToken").mockImplementation(() => {
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
  iss: "https://accounts.google.com",
};
