# GAE JS STORAGE

SearchService implementation that uses the GAE Search API via the
[https://github.com/mondo-mob/gae-search-service](https://github.com/mondo-mob/gae-search-service) GAE Search Service proxy.

This allows you to create data repositories that automatically index the data on mutation
and then search against your stored entities.

## Installation

```sh
npm install @mondomob/gae-js-storage
```

## Components

### GaeSearchService

Step 1: Initialise and set GaeSearchService as the search provider 
```
// Add module config schema to your app config schema
const configSchema = t.intersection([
  gaeJsCoreConfigurationSchema,
  gaeJsGaeSearchConfigurationSchema,
  // Other module schemas
]);

// Add endpoint to your config file
{
  "searchServiceEndpoint": "https://my-search-service.appspot.com"
}

// Set search provider on app startup
searchProvider.set(new GaeSearchService());
```

Step 2. Define your repository by extending SearchableRepository and providing your index configuration

```
class MyUserRepository extends SearchableRepository<User> {
  constructor() {
    super(new FirestoreRepository<User>("my-users"), {
      indexName: "users",
      indexConfig: {
        // Use true to index the property as-is from the object
        firstName: true,
        // Or pass a function to run custom logic first on the data first
        fullName: (value) => `${value.firstName} ${value.lastName}`,
      },
    });
  }
}
```

Step 3. Use the repository

```
const userRepository = new MyUserRepository();

await userRepsitory.save({id: "123", firstName: "App", lastName: "Engine"});

const results = await userRepository.search({ firstName: "App"});
```
