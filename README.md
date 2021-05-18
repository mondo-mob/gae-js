# GAE JS

Simplify building NodeJS applications on Google App Engine (GAE)

## Installation

Install the core component:
```sh
npm install @dotrun/gae-js-core
```

Then depending on your use case install the components you want to use. e.g.

```sh
npm install @dotrun/gae-js-firestore
npm install @dotrun/gae-js-firebase-auth
```

## Usage
Here's an example Express app configuration that uses the core library as well as both firestore and firebase auth.

```
// Create a request aware logger
const logger = createLogger("gae-js-demo");

// Create your express app as normal
const app = express();

// Add the core gae-js logging and async storage middlewares
app.use(gaeJsApp);

// Add firestore support (with dataloader for graphql support)
app.use(firestoreLoader(connectFirestore()));

// Add firebase auth support
const firebaseAdmin = admin.initializeApp({ projectId: <my-gcp-project-id> });
app.use(verifyFirebaseUser(firebaseAdmin));

// Add handlers as required
app.get(
  "/demo-items",
  requiresUser(),                   // <-- Util middleware that enforces a valid user
  handleAsync(async (req, res) => { // <-- Util middleware that lets you write async handlers
    const repository = new FirestoreRepository<DemoItem>("demo-items");
    logger.info("listing demo-items from firestore");
    const list = await repository.query();
    res.send(`Hello firestore ${JSON.stringify(list)}`);
  })
);

app.use((err, req, res, next) => {
  // your error handling logic goes here
  logger.error("Error", err);
  res.status(500).send("Bad stuff happened")
});
```

## Background

This library is mostly a deconstructed version of what is offered by 
[gae-node-nestjs](https://github.com/mondo-mob/gae-node-nestjs) and
[generator-gae-node-nestjs](https://www.npmjs.com/package/@mondomob/generator-gae-node-nestjs) libraries.

You can do a lot with these libs but they can be difficult to customise. For example the data layer 
is heavily tied to using Firestore in Datastore Mode and assumes you want to use graphql. It's not
a great fit if you only want to build a simple API with Firestore Native db.

So the intention with this library was to offer a similar feature set but in a minimal way.
i.e. almost everything is optional

## Components

### gae-js-core ([documentation](./packages/gae-js-core/README.md))

#### Async Local Storage Support

This library relies on Async Local Storage for passing data around. Yes it's still an Experimental NodeJS
API but it's really useful and the general push is to mark it as stable soon (https://github.com/nodejs/node/issues/35286).

#### Logging
Create request aware Bunyan loggers for Cloud Logging.
All of your logs from a single request will be correlated together in Cloud Logging.

#### Configuration
Extendable, typed and environment aware configuration loader

#### Configuration Secrets
Seamlessly load secrets stored in "Google Cloud Secret Manager"

#### Client Runtime Configuration
Provide your static client applications with runtime configuration via the "Google Cloud Runtime Config API"

#### Serving static resources with etags
Serve static assets with strong etags to workaround GAE build wiping out your file timestamps

#### Authentication/Authorization
Middleware to protect your routes to authenticated users or specific user roles

#### Other stuff
A few other (hopefully) useful things to help you along the way and stop reinventing the wheel
