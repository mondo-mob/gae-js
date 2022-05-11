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
const userRepository = new TimestampedRepository<User>("users");

export const v_20220122_001_addUsers: AutoMigration = {
    id: "v_20220122_001_addUsers",
    migrate: async ({ logger }) => {
      logger.info("Adding users");
    
      const createdUsers = await userRepository.save([
        {
          ...newTimestampedEntity("user1"),
          name: "User 1",
        },
        {
          ...newTimestampedEntity("user2"),
          name: "User 2",
        },
      ]);
      logger.info(`Creating ${createdUsers.length} new users`);
    },
}
```

#### Application Startup (index.ts)
```
import { bootstrap } from "@mondomob/gae-js-core";
import { bootstrapMigrations } from "@mondomob/gae-js-migrations";
import { firestoreLoader, firestoreProvider, newTimestampedEntity } from "@mondomob/gae-js-firestore";
import {v_20220122_001_addUsers} from "./migrations/v_20220122_001_addUsers"

// Add firestore support
firestoreProvider.init();
app.use(firestoreLoader());

// After firestore initialised
const migrations: AutoMigration[] = [
    v_20220122_001_addUsers
];

await bootstrap([bootstrapMigrations(migrations)]);
```