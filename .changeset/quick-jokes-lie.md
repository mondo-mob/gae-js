---
"@mondomob/gae-js-core": major
"@mondomob/gae-js-firebase-auth": major
---

The BaseUser typings have been loosened to provide more compatibility with real user types.

The default userRequestStorage has been removed. Instead, consumers must initialise the `userRequestStorageProvider` with the app specific user storage.

```typescript
const userStorage = new RequestStorageStore<AppUser>("_APPUSER", appUserSchema)
```

