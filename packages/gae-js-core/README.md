# GAE JS CORE

The core stuff needed for most apps.

## Installation

```sh
npm install @mondomob/gae-js-core
```

## Conventions
There are a few conventions that must be followed for the library to function correctly.

* Project naming. For configuration to work correctly the gcp projects must be named with a suffix
  of the environment they represent. e.g. `my-project-dev` implies this is the "dev" environment and
  configuration will be loaded from the dev.json config file.
* To help the library know what runtime environment it is executing in you must define an environment
  variable called GAEJS_ENVIRONMENT. e.g. for appengine in your `app.yaml` file:
    ```yaml
    env_variables:
      GAEJS_ENVIRONMENT: appengine
    ```

## Components

### Async Local Storage Support

Set and fetch request level data without needing to pass any variables around.
- Set/Fetch adhoc key/value pairs
- Define custom "Stores" to simplify set/fetch operations


```typescript
// Create your express app and add core gaeJsApp middleware
import { userRequestStorage } from "./user-request-storage";

const app = express();
app.use(gaeJsApp);

// Define a custom typed store
export const customRequestStorage = new RequestStorageStore<string>("_my_custom_key");

app.use((req, res, next) => {
  // Set ad-hoc key/value data
  setRequestStorageValue("REQ_TIMESTAMP", `${Date.now()}`);
  // Use the typed store
  customRequestStorage.set('some value to save for later')
  next();
});

app.use((req, res, next) => {
  // Get the ad-hoc value by key
  const adhoc = getRequestStorageValue("REQ_TIMESTAMP");

  // Use the custom store
  const value = customRequestStorage.get();

  // Use the predefined user store
  const user = userRequestStorage.get();
  next();
});
```

### Logging
Create request aware loggers for Cloud Logging.
When log entries are made from within a request they can be correlated together in Cloud Logging.

```javascript
// Create your logger anywhere (e.g. can be before logging middleware applied)
const logger = createLogger("gae-js-demo");

// Create your express app and add core gaeJsApp middleware
const app = express();
app.use(gaeJsApp);

logger.info("This log entry is outside of request");

app.use((req, res, next) => {
  logger.info("This log is inside request and will be assigned a correlation id")
  next();
})
```

### Configuration
Typed configuration loader that loads and merges configuration from files, environment variables and static options into a typed object.

NOTE: For GCP environments the projectId can be automatically identified and by default the environment is 
derived from the project id (see conventions). For local development the projectId must be explicitly 
defined. The recommended approach is to set GAEJS_PROJECT environment variable to the form "your-project-local" to 
match the GCP project name conventions. This will identify the environment as `local` and load configuration from `local.json`.

Basic setup:

1. Organise your configuration files in a `config` folder underneath the working directory of your app:
```shell
/config/default.json       <- Common base config
       /local.json         <- local development
       /dev.json           <- dev environment config
       /uat.json           <- uat environment config
       /prod.json          <- prod environment config
       /yourOwnEnv.json    <- any other environments you have
```

2. In your app create the typings for your desired configuration and a ConfigValidator instance.
This can be any function that takes some unknown data and returns a typed instance of your configuration.
e.g. the library contains a pre-built zod validator:

```typescript
// Define the zod configuration schema you want to use for your app
import { z } from "zod";
// Include the schemas from the libraries you are using (use merge if there are multiple)
const configSchema = gaeJsCoreConfigurationSchema.merge(gaeJsFirestoreConfigurationSchema).extend({
  // Extend and add your own config
  something: z.string(),
});

// Create ConfigValidator from schema
const validator = zodValidator(configSchema);
```

3. Initialise the configuration
```typescript
// Option 1: Initialise config into a local variable
const config = await initialiseConfiguration({ validator });

// Option 2: Initialise the configurationProvider for use globally
await configurationProvider.init({ validator });
```

### Configuration Secrets
Seamlessly load secrets stored in "Google Cloud Secret Manager" from references in your application configuration.

Step 1: Enable Secret Manager API (`secretmanager.googleapis.com`) in the target project and create any secrets you require. e.g. API_PASSWORD

Step 2: Add the `Secret Accessor` role (`roles/secretmanager.secretAccessor`) to the App Engine service account

Step 3: Update your config files to include secret references

```json
{
  "projectId": "my-project-dev",
  "apiPassword": "SECRET(API_PASSWORD)"
}
```

That's it - when the config is initialised the secret will be resolved and accessible within your app as `config.apiPassword`


### Serving static resources with ETags
Around September 2020 Google changed the way it builds GAE apps so that all file timestamps are zeroed out.
This is intentional to be able to have reproducible builds but essentially breaks ExpressJS apps that serve
static assets. Background issue is here: https://issuetracker.google.com/issues/168399701

By default Express sends weak etags based on the file size and file timestamp. Given the date is now always the same
the etag is generated purely from the file size. An example where this will catch you out is if you serve your create-react-app
index.html. New builds will often only change the hashed values within the html - so while the content has changed the file size
hasn't and neither does the eTag. Then you'll scratch your head for a while trying to work out why the client isn't loading the
new build you just deployed.

Disabling etags is not a solution because falling back to "If-Modified-Since" headers will also fail.
Configuring express to send strong etags will not work because express.static and res.sendFile do not honour this and only send weak etags.

So this library provides the simplest way we can think to workaround this. It works a bit like express.static but sends
strong etags generated by an MD5 hash of the file contents. These are lazily generated and cached so only the first
request needs to generate the hash.

```
// Serve static assets within "public" folder
app.use(serveStaticWithEtag("public"));

// Other routes go here...

// Serve index.html as fallback to support client side routing
app.use("/*", serveFallbackWithEtag("public/index.html"));
```


### Authentication/Authorization

#### User store
Whatever auth mechanism you use it should store the active user in the userRequestStorage.
This way the auth middleware or other parts of you code can easily access the request user

```typescript
app.use((req, res, next) => {
  try {
    // Whatever you need to do to validate/load the request user
    const user = validateUserFromRequest(req);
    // Set user onto request storage for use later
    userRequestStorage.set(user);
    next();
  } catch (e) {
    next(e);
  }
})
```

#### Middleware
Middleware to protect your routes to authenticated users or specific user roles

```typescript
// Require that a user must exist for this request
app.get("/needs-user", requiresUser(), (req, res) => {});

// Require that a user with a specific role must exist for this request
app.get("/needs-user-with-role", requiresRole("ADMIN"), (req, res) => {});

// Require that the request has a specific header
app.get("/needs-header", requiresHeader("x-special-header"), (req, res) => {});

// Verify that the request is a valid Appengine Cron request
app.get("/cron-handler", verifyCron, (req, res) => {});
```


### Other stuff
Other (hopefully) useful things to help you along the way and stop reinventing the wheel

asyncMiddleware?
