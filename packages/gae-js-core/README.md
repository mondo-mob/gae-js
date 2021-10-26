# GAE JS CORE

The core stuff needed for most apps.

## Installation

```sh
npm install @dotrun/gae-js-core
```

## Conventions
There are a few conventions that must be followed for the library to function correctly.

* Project naming. For configuration to work correctly the gcp projects must be named with a suffix
  of the environment they represent. e.g. `my-project-dev` implies this is the "dev" environment and
  configuration will be loaded from the dev.json config file.
* To help the library know what environment it is executing in you must define an environment
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
Extendable typed configuration loader based around "config" library.

NOTE: The environment is automatically detected from the project name. See Conventions for more details.
NOTE: The GCP_ENVIRONMENT environment variable must be set when running on GCP (not locally). See Conventions for more details.

Organise your configuration files in the following way:
```shell
/config/default.json       <- Common base config
       /development.json   <- Local development
       /dev.json           <- dev environment config
       /uat.json           <- uat environment config
       /prod.json          <- prod environment config
```
Then in your app:
```typescript

// Define the io-ts configuration schema you want to use for your app
export const configSchema = t.intersection([
  // Include the schemas from the libraries you are using
  gaeJsCoreConfigurationSchema,
  gaeJsFirestoreConfigurationSchema,
  // Add the other config properties you need
  t.type({
    something: t.string,
  }),
]);

// Initialise the config
const config = await initialiseConfiguration(configSchema);

// Optionally set into global provider for use elsewhere
configurationProvider.set(config);
```

### Configuration Secrets
Seamlessly load secrets stored in "Google Cloud Secret Manager" from references in your application configuration.

Step 1: Enable Secret Manager API in the target project and create any secrets you require. e.g. API_PASSWORD

Step 2: Add the `Secret Accessor` role to the App Engine service account

Step 3: Update your config files to include secret references

```json
{
  "projectId": "my-project-dev",
  "host": "https://my-project-dev.ts.r.appspot.com",
  "apiPassword": "SECRET(API_PASSWORD)"
}
```

That's it - when the config is initialised the secret will be resolved and accessible within your app as `config.apiPassword`

### Client Runtime Configuration
Provide your static client applications with runtime configuration via the "Google Cloud Runtime Config API"

This is particularly useful for app serving static single pages applications (SPAs) like those created by Create React App.
Normally with these applications any client side configuration is built into the javascript bundle at build time. So if you 
need to have different configuration for different environments you either have to rebuild the app or bundle all of the 
config for every environment you need. Any time a configuration value changes the bundle must be rebuilt. Some background info
here [https://github.com/facebook/create-react-app/issues/578]https://github.com/facebook/create-react-app/issues/578.

The solution here is for the client to fetch its config from the server on first load. The server loads the appropriate 
config from the Google Cloud Runtime Config API and returns it as a javascript file that populates the `window.client_env`
property. Any client code can then fetch the config it needs from that 

The trade-off is an extra round-trip to the server so may not be suitable for all applications.

Step 1: Define your config in the GCP projects

- Create config `web-client-config` (or whatever you want to call it)
gcloud beta runtime-config configs create web-client-config --project=<your gcp project name>
  
- Add config values
gcloud beta runtime-config configs variables set <CONFIG_KEY> <CONFIG_VALUE> —config-name=web-client-config --project=<your gcp project name>
... any other values you need

Step 2: Add middleware
```javascript
app.use("/client-env.js", clientRuntimeEnv("web-client-config"));
```

Step 3: Update index.html to load the javascript
```html
<html>
  <body>
    ...other stuff
    <script src="%PUBLIC_URL%/client-env.js"></script>
  </body>
</html>
```

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
app.use("/needs-user", requiresUser(), (req, res) => {});

// Require that a user with a specific role must exist for this request
app.user("/needs-user-with-role", requiresRole("ADMIN"), (req, res) => {});
```


### Other stuff
Other (hopefully) useful things to help you along the way and stop reinventing the wheel

handleAsync?