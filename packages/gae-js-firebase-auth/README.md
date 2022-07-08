# GAE JS FIREBASE AUTH

Use Firebase Auth to authenticate your users

## Installation

```sh
npm install @mondomob/gae-js-firebase-auth
```

## Usage

The `verifyFirebaseUser` middleware will inspect the request headers and if an
`Authorization` header with a Bearer token is found it is validated as a Firebase
Auth token. For a valid user the details are mapped into a local BaseUser instance and
set into request storage for use downstream.

e.g.

Step 1: Initialise Firebase Auth and apply middleware
```typescript
// Add firebase auth support
const firebaseAdmin = admin.initializeApp({ projectId: config.projectId });
app.use(verifyFirebaseUser(firebaseAdmin));
```

Step 2: Access user info or apply guard middleware

```typescript
import { requiresRole } from "./requires-role";

// Adhoc access
app.user("/endpoint1", (req, res) => {
  const user = userRequestStorage.get();
  res.send(user ? "Logged in" : "No user found")
})

// requiresUser guard will throw if no user found
app.get(
  "/roles",
  requiresUser(),
  asyncHandler(async (req: Request, res: Response) => {
    const user = userRequestStorage.get();
    res.send(`You have roles ${user.roles}`);
  })
);

// requiresRole guard will throw if no user or user does not have the specified role
app.put(
  "/roles",
  requiresRole("ADMIN"),
  asyncHandler(async (req: Request, res: Response) => {
    const user = userRequestStorage.get();
    const { body } = req;
    await admin.auth().setCustomUserClaims(user.id, { roles: body.roles });
    res.send(`User now has roles ${body.roles}`);
  })
);

```
