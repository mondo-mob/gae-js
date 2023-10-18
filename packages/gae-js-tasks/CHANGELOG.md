# @mondomob/gae-js-tasks

## 11.2.0

### Minor Changes

- e207a5c: Add support for creating Http Target tasks (thanks @VivekRajagopal!).

  Use this to target tasks handlers on any http address - i.e. non app engine handlers, app engine
  handlers hosted in a different project from the task queue or app engine handlers
  but not via the default appspot domain.

  When creating the task service specify the target host and optional authentication configuration.

  ```typescript
  // Create service
  const taskQueueService = new TaskQueueService({
    httpTargetHost: "https://my-host.com",
    oidcToken: {
      serviceAccountEmail: "my-service-account@example.com",
      audience: "my-audience",
    },
  });

  // Create tasks
  // e.g. this will result in a task request of: POST https://my-host.com/tasks/example-task
  await taskQueueService.enqueue("example-task", { data: { key: "value1" } });
  ```

## 11.1.0

### Minor Changes

- 667cfa9: Add support for throttling tasks based on Cloud Tasks built-in task deduplication.

  e.g. to only execute a task once every 60 seconds

  ```typescript
  await taskService.enqueue("start-job", {
    body: { jobname: "job123" },
    throttle: { suffix: "start-job", periodMs: 60000 },
  });
  ```

  For throttled tasks, the service will calculate the next execution window for the given period.
  The task will then be assigned an explicit task name based on this window and the provided suffix.
  Subsequent tasks within the same window will be assigned the same name and Cloud Tasks will reject them.
  The service will automatically identify and ignore these rejections.

## 11.0.2

### Patch Changes

- 3385b9f: Export missing types added in last major release

## 11.0.1

### Patch Changes

- 410f9b5: Unpin zod version and patch release all libs to force schema regeneration.

## 11.0.0

### Major Changes

- 2fe4b19: Service refactored to simplify usage and allow for future enhancements

  - Configuration schema removed. Often multiple task queue service instances are created for an application so providing
    application level config for these settings didn't make sense. All options provided by the old schema can be passed when
    creating the tasks service instances.

  - Service creation no longer relies on passing `GaeJsCoreConfiguration` instance when overriding settings. All options can be overridden individually.

  - `enqueue` method signature has changed to accept a single string and optional options object. This will allow additional
    options to be added without affecting signature in future releases.

  Upgrade Instructions:

  - If you previously did not initialise task provider with `tasksProvider.init()` then you will need to add this to your app startup.

  - Remove any references to `gaeJsTasksConfigurationSchema` or `GaeJsTasksConfiguration`.
    Any properties used should be added to application's config schema and passed as options when constructing the Tasks service instance.
    e.g. to override service project and location:

    ```typescript
    const taskQueueService = new TaskQueueService({
      projectId: appConfig.tasksProjectId,
      location: appConfig.tasksLocation,
    });
    ```

  - Update constructor calls to use new signature:

    e.g. Change from

    ```typescript
    const taskQueueService = new TaskQueueService({
      pathPrefix: "/admin-tasks",
      configuration: {
        ...getAppConfiguration(),
        tasksRoutingService: "admin",
      },
    });
    ```

    to this:

    ```typescript
    const taskQueueService = new TaskQueueService({
      pathPrefix: "/admin-tasks",
      tasksRoutingService: "admin",
    });
    ```

    Calls to enqueue should be updated to use the new signature
    e.g.

    ```typescript
    enqueue("my-task", { id: "123" }, 60);
    ```

    Should now be:

    ```typescript
    enqueue("my-task", {
      data: { id: "123" },
      inSeconds: 60,
    });
    ```

## 10.0.0

### Patch Changes

- Updated dependencies
  - @mondomob/gae-js-core@7.0.0

## 9.3.2

### Patch Changes

- b8da039: Update internal libs to non-breaking latest where applicable

## 9.3.1

### Patch Changes

- e0428bb: Unpin all direct dependency versions

## 9.3.0

### Minor Changes

- 58e50ef: Update dependencies where practical

### Patch Changes

- 4fc4699: Update Typescript to 4.9.3

## 9.2.0

### Minor Changes

- e9d9692: Update dependencies and fix typing issues picked up by typescript 4.8.4

## 9.1.0

### Minor Changes

- 234e7d2: Add support for `inSeconds` for local tasks

## 9.0.0

### Minor Changes

- c867c43: Update to use recommended Node TSConfig settings (for Node 14)

### Patch Changes

- Updated dependencies [c3437ca]
- Updated dependencies [c867c43]
- Updated dependencies [0a579c2]
  - @mondomob/gae-js-core@6.0.0

## 8.0.0

### Major Changes

- f1766f6: BREAKING: Replace io-ts schemas for config with zod.

  To upgrade, install `zod` and replace your config validators such as

  ```typescript
  // Define the io-ts configuration schema you want to use for your app
  const configSchema = t.intersection([
    // Include the schemas from the libraries you are using
    gaeJsCoreConfigurationSchema,
    gaeJsFirestoreConfigurationSchema,
    // Add the other config properties you need
    t.type({
      something: t.string,
    }),
  ]);

  // Create ConfigValidator from schema
  const validator = iotsValidator(configSchema);
  ```

  with

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

### Patch Changes

- Updated dependencies [f1766f6]
  - @mondomob/gae-js-core@5.0.0

## 7.0.0

### Major Changes

- 437b763: Peer dependency for @google-cloud/tasks updated to be v3

## 6.0.1

### Patch Changes

- c37b973: Update internal dependencies for vulnerability fixes

## 6.0.0

### Major Changes

- 1d43bc8: Replaced `serviceTasksOnThisVersion` config option with `tasksRoutingVersion` and `tasksRoutingService` options for routing requests to a specific app version or service respectively.

## 5.0.0

### Major Changes

- 1e9a6bd: Remove leading slash from tasks names. We always add a slash so this prevents accidental double slashes in final urls.

### Patch Changes

- Updated dependencies [3b8ae34]
  - @mondomob/gae-js-core@4.0.0

## 4.0.0

### Patch Changes

- Updated dependencies [e2c5732]
- Updated dependencies [98927e8]
- Updated dependencies [0040e76]
  - @mondomob/gae-js-core@3.0.0

## 3.0.0

### Major Changes

- 2a74d7c: Improve typing for task queue service and require payload to extend (object). This is potentially breaking as it allowed any before. Hide internal functions which were accidentally exposed as public previously.

  **Breaking changes**

  - `enqueue` payload must now extend `object` as it converts to a JSON string and was assuming so. If you previously called with a primitive, then wrap in an object.
  - Internal functions for `appEngineQueue` and `localQueue` marked `private` as they are not intended to be called directly.

## 2.0.0

### Major Changes

- bf62e83: BREAKING: gae-js-core `host` and `location` configuration properties are now optional. This may be break typings expecting them to be non-null.
- f62bb4b: Update to new configuration conventions

### Minor Changes

- New `tasksLocation` and `tasksProjectId` configuration properties allow overriding core properties.

### Patch Changes

- e3e7a5f: Update dependencies to latest. Move common dev dependencies to root
- Updated dependencies [e3e7a5f]
- Updated dependencies [cd1b365]
- Updated dependencies [3e56c75]
- Updated dependencies [8eca18c]
- Updated dependencies [c6d48a7]
  - @mondomob/gae-js-core@2.0.0

## 1.0.3

### Patch Changes

- b0ea909: Local task queues now only log task execution errors. This is to prevent local server crashes due to unhandled exceptions.

## 1.0.2

### Patch Changes

- 0f37d07: Minor audit fix for security vulnerabilities. May not even impact bundle, but releasing to be sure.

## 1.0.1

### Patch Changes

- 552ecd2: Update dependencies

## 1.0.0

### Major Changes

- 08206d9: Bump all packages to v1.0.0 release. This is mainly to get better semver support - i.e. with versions 0.x.x a minor is considered a major for consumers.

### Patch Changes

- Updated dependencies [6ed9213]
- Updated dependencies [08206d9]
  - @mondomob/gae-js-core@1.0.0

## 0.4.6

### Patch Changes

- Another patch release to test changeset build
- Updated dependencies
  - @mondomob/gae-js-core@0.4.6

## 0.4.5

### Patch Changes

- 023ec3f: Change build to use Typescript project references
- Updated dependencies [023ec3f]
  - @mondomob/gae-js-core@0.4.5

## 0.4.4

### Patch Changes

- 6ec98bd: Use `prepublishOnly` script to trigger build instead of `prepublish` which is no longer run during publish lifecycle in npm 7+
- Updated dependencies [6ec98bd]
  - @mondomob/gae-js-core@0.4.4

## 0.4.3

### Patch Changes

- Removed lerna and replaced with npm workspace and changesets
- Updated dependencies
  - @mondomob/gae-js-core@0.4.3
