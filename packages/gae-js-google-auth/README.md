# GAE JS GOOGLE AUTH

Utilities extending on [Google Auth Library](https://github.com/googleapis/google-auth-library-nodejs#readme), such as middleware to validate Google JWT.

## Installation

```sh
npm install @mondomob/gae-js-google-auth
```

## Components

### requiresGoogleJwt Middleware
Middleware to require a valid Google JWT token, for your endpoints. 

An example can be found in the [Example Pub/Sub JWT](https://cloud.google.com/pubsub/docs/push#jwt_format). This middlware will _always_ verify:
 - An `Authorization` header is present with a `Bearer <token>` value
 - The `<token>` component is a valid token according to [Google Auth Library](https://github.com/googleapis/google-auth-library-nodejs#readme)
 - The following claims:
   - `email_verified` is `true`
   - `iss` is `"https://accounts.google.com"`

Simplest usage

```typescript
// Apply middleware however you normally would
app.use("/pubsub", requiresGoogleJwt());

// Now any matching routes will be protected
app.post("/pubsub/start-job", (req, res) => res.send("OK"));
app.post("/pubsub/poll-status", (req, res) => res.send("OK"));
```

It is recommended that you also verify the `email` matches the identity you expect of the signer (e.g. a service account email).

```typescript
// Apply middleware however you normally would
app.use("/pubsub", requiresGoogleJwt({
   email: "your-service-account@your-project.iam.gserviceaccount.com"
}));

// Now any matching routes will be protected
app.post("/pubsub/start-job", (req, res) => res.send("OK"));
app.post("/pubsub/poll-status", (req, res) => res.send("OK"));
```

**Note:** The `email` property also supports an array of values if your endpoints should be _one of_ a set of allowed emails.

If you care about the `audience` property you can also specify this property as a single value or an array.

By default, this middleware will be disabled if run in an environment outside of GCP (local testing, for example). If you would like to override
this behaviour, you can set `disableForNonGcpEnvironment` to `false`.
