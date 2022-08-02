---
"@mondomob/gae-js-core": major
"@mondomob/gae-js-datastore": major
"@mondomob/gae-js-firestore": major
"@mondomob/gae-js-gae-search": major
"@mondomob/gae-js-migrations": major
"@mondomob/gae-js-storage": major
"@mondomob/gae-js-tasks": major
---

BREAKING: Replace io-ts schemas for config with zod.

To upgrade, install `zod` and replace your config validators such as

```typescript
// Define the io-ts configuration schema you want to use for your app
const configSchema = t.intersection([
  // Include the schemas from the libraries you are using
  gaeJsCoreConfigurationSchema,
  gaeJsFirestoreConfigurationSchema,
  // Add the other config properties you need
  t.type({
    something: t.string
  })
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
  something: z.string()
});

// Create ConfigValidator from schema
const validator = zodValidator(configSchema);
```
