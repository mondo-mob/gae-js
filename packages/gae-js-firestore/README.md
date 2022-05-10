# GAE JS FIRESTORE

Use Firestore in Native mode as your app db including [DataLoader](https://github.com/graphql/dataloader) implementation GraphQL
 and request level caching.
## Installation

```sh
npm install @mondomob/gae-js-firestore
```

## Components

### FirestoreProvider
Initialise Firestore to be accessed elsewhere in your app.

```
// On app startup
firestoreProvider.init();

// Anywhere else in your app
const firestore = firestoreProvider.get();
const doc = await firestore.doc('my-items/id123').get();
```

### FirestoreLoader
Dataloader implementation to help batch and cache db requests. Used internally by FirestoreRepository

```
// Apply middleware to create a new dataloader on each request
app.use(firestoreLoader());
```

### FirestoreRepository
Access your collections through typed repositories.

```
// Define your class entity
interface DemoItem {
  id: string;
  name: string;
}

// Initialise repository for the collection we want to access data in
const repository = new FirestoreRepository<DemoItem>("demo-items");

// OR define a custom class first
class DemoItemRepository extends FirestoreRepository<DemoItem> {
  constructor() {
    super("demo-items");
  }
}
const repository = new DemoItemsRepository();

// Save an item
await repository.save({ id: "id123", name: "test item" });

// Get an item
const item = await repository.get("id123");

// Query items
const list = await repository.query();

// Query items with ordering
const results = repository.query({
 sort: {
   property: "owner",
   direction: "desc",
 }
})

// Query items for specific fields (i.e. projection)
const results = await repository.query({
  filters: [
    {
      fieldPath: "owner",
      opStr: "==",
      value: "user1",
    },
  ],
  select: ["name", "otherProp"],
});

// Query items with limit/offset
const results = await repository.query({
  filters: [
    {
      fieldPath: "owner",
      opStr: "==",
      value: "user1",
    },
  ],
  limit: 2,
  offset: 2,
});

// Query items with cursors
const results = await repository.query({
  sort: { property: "owner" },
  startAfter: ["user2"],
});

```

### TimestampedRepository
Convenience Repository type to auto-populate createdAt/updatedAt timestamps on insert/save/update

```
// Define your class entity
interface DemoItem extends TimestampedEntity {
  name: string;
}

// Initialise repository
const repository = new TimestampedRepository<DemoItem>("demo-items");

// Create a new item with helper method
await repository.save({ ...newTimestampedEntity("id123"), name: "test item" });

// Save an item and updatedAt will get set to current time
const item = await repository.get("id123");
await repository.save({ ...item, name: "updated item" });
```

### @Transactional

Annotate functions to make them transactional.

NOTE: Requires `"experimentalDecorators": true` set in your `tsconfig.json`

```typescript
class UserService {
  constructor(
    public userRepo: FirestoreRepository<User>,
  ) {}

  @Transactional()
  async addCredits(userId: string, credits: number): Promise<User> {
    const user = this.userRepo.get(userId);
    user.credits = user.credits + credits;
    return this.userRepo.save(user);
  }
}
```