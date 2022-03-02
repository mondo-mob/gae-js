# GAE JS

Simplify building NodeJS applications on Google App Engine (GAE)

## Installation

Install the core component:
```sh
npm install @mondomob/gae-js-core
```

Then depending on your use case install the components you want to use. e.g.

```sh
npm install @mondomob/gae-js-firestore
npm install @mondomob/gae-js-firebase-auth
```

## Usage
Here's an example Express app configuration that uses the core library as well as both Firestore and Firebase Auth.

```
// Create a request aware logger
const logger = createLogger("gae-js-demo");

// Create your express app as normal
const app = express();

// Add the core gae-js logging and async storage middlewares
app.use(gaeJsApp);

// Add firestore support (with dataloader for graphql support)
firestoreProvider.init();
app.use(firestoreLoader());

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
i.e. almost everything is optional. 

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

#### Search
Framework for adding search capability to your data layer

#### Other stuff
A few other (hopefully) useful things to help you along the way and stop reinventing the wheel

### gae-js-datastore ([documentation](./packages/gae-js-datastore/README.md))

#### Use Cloud Datastore (or Firestore in Datastore mode)
Access your collections through typed repositories, backed by a DataLoader implementation to support GraphQL.

#### Simple transaction support
Use annotations on your methods to make them transactional


### gae-js-firestore ([documentation](./packages/gae-js-firestore/README.md))

#### Use Firestore in Native mode
Access your collections through typed repositories, backed by a DataLoader implementation to support GraphQL.

#### Simple transaction support
Use annotations on your methods to make them transactional

### gae-js-firebase-auth ([documentation](./packages/gae-js-firebase-auth/README.md))
#### Use Firebase Auth to authenticate your users
Middleware to verify Firebase Auth tokens and set user into the request

### gae-js-gae-search ([documentation](./packages/gae-js-gae-search/README.md))
#### Search service implementation for GAE Search API
Use GAE Search API to index and search your repository data

### gae-js-storage ([documentation](./packages/gae-js-storage/README.md))
#### Use Cloud Storage in your app
Simplifies client initialisation and common storage tasks


## Contributing

This is a mono-repo using npm workspaces.
Publishing is done using Atlassian Changesets (https://github.com/changesets/changesets).
This helps be consistent with versioning and auto-generates changelogs.

Here's the basic flow:

1. Create one or more changesets

- Once you've made your changes, create a changeset. You can create more than one changeset for a single version.

```
npx changeset
```

- From the cli tool, choose which packages to update and if major/minor/patch update
- Enter summary for changes
- Review and commit files

2. Update package versions

- Based on the changeset configuration - this will automatically version the packages.

```
npx changeset version
```

- Commit changes

3. Build and publish

Would be nice if this was done from CI but for now we do this locally.

- Check you're running a suitable version of node/npm. If not switch and clear out old node_modules.
- Build and publish

```
npm run clean -ws
npx changeset publish
git push --follow-tags
```
