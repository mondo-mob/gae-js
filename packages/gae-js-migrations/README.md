# GAE JS MIGRATIONS

Setup and Run migrations, with state stored in firestore and a mutex lock to ensure only one is run at a time

## Installation

```sh
npm install @mondomob/gae-js-migrations
```

## Components

### runMigrations
Run Migrations as a function e.g /migrate route handler


### bootstrapMigrations
Bootstrap Migrations to be run before application starts

#### Migration Files

Use naming convention with date and index number to version migrations
\
`migrations/v_20220122_001_addUsers.ts`
```
export const v_20220122_001_addUsers: AutoMigration = {
    id: "v_20220122_001_addUsers",
    migrate: async ({ logger }) => {
      logger.info("Adding users");
    
      const investmentOptions = await userRepository.save([
        {
          ...newTimestampedEntity("Test"),
          name: "Test",
        },
      ]);
      logger.info(`Creating ${investmentOptions.length} new investment options`);
    },
}
```

#### Application Startup (index.ts)
```
import { bootstrap } from "@mondomob/gae-js-core";
import {connectFirestore, firestoreLoader, firestoreProvider, newTimestampedEntity} from "@mondomob/gae-js-firestore";
import {v_20220122_001_addUsers} from "./migrations/v_20220122_001_addUsers"

// Repository
const userRepository = new TimestampedRepository<User>("users");

// Add firestore support
firestoreProvider.init();
app.use(firestoreLoader());

// After firestore initialised
const migrations: AutoMigration[] = [
    v_20220122_001_addUsers
];

await bootstrap([migrationBootstrapper(migrations)]);
```