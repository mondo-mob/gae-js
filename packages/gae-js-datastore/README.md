# GAE JS DATASTORE

Use Cloud Datastore (or Firestore in Datastore Mode) as your app db including [DataLoader](https://github.com/graphql/dataloader) implementation GraphQL
and request level caching.

## Installation

```sh
npm install @dotrun/gae-js-datastore
```

## Components

### DatastoreRepository
Access your collections through typed repositories.

Step 1: Define your entity

```
// Define your class schema
const demoItemSchema = t.type({
  id: t.string,
  name: t.string,
});

// Define your class type
type DemoItem = t.TypeOf<typeof demoItemSchema>;

// Initialise repository for the collection we want to access data in
const repository = new DatastoreRepository<DemoItem>("demo-items", {validator: demoItemSchema });

// OR define a custom class first
class DemoItemRepository extends DatastoreRepository<DemoItem> {
  constructor() {
    super("demo-items", demoItemSchema);
  }
}
const repository = new DemoItemsRepository();

// Save an item
await repository.save({ id: "id123", name: "test item" });

// Get an item
const item = await repository.get("id123");

// Query items
const list = await demoItemsRepository.query();
```

### @Transactional

Annotate functions to make them transactional.

NOTE: Requires `"experimentalDecorators": true` set in your `tsconfig.json`

```typescript
class UserService {
  constructor(
    public userRepo: DatastoreRepository<User>,
  ) {}

  @Transactional()
  async addCredits(userId: string, credits: number): Promise<User> {
    const user = this.userRepo.get(userId);
    user.credits = user.credits + credits;
    return this.userRepo.save(user);
  }
}
```