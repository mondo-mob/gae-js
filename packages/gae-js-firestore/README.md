# GAE JS FIRESTORE

Use Firestore in Native mode as your app db including [DataLoader](https://github.com/graphql/dataloader) implementation GraphQL
 and request level caching.
## Installation

```sh
npm install @dotrun/gae-js-firestore
```

## Components

### FirestoreRepository
Access your collections through typed repositories.

Step 1: Define your entity

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
const list = await demoItemsRepository.query();
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