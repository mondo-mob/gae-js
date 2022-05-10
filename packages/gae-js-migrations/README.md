# GAE JS MIGRATIONS

Setup and Run migrations, with state stored in firestore with a mutex lock 

## Installation

```sh
npm install @mondomob/gae-js-migrations
```

## Components

### MigrationsBootstrapper
Initialise Migrations to be run before app starts

```
import { bootstrap } from "./bootstrap/bootstrap.service";

// Migrations

const migration1: AutoMigration = {

};

const migrations = []

// On app startup
  await bootstrap([migrationBootstrapper(migrations, config)]);

```