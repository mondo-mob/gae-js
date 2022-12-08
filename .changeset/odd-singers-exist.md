---
"@mondomob/gae-js-firestore": major
---
Query sort supportes nested fields.

BREAKING: Query `sort` objects have a rename from `property` to `fieldPath`. This allows sorting by nested field paths instead of direct fields only.

Replace:

```typescript
const results = await repository.query({
  sort: {
    property: "prop1",
    direction: "desc",
  },
});
```

with

```typescript
const results = await repository.query({
  sort: {
    fieldPath: "prop1",
    direction: "desc",
  },
});
```

And you also now have the ability to do
```typescript
const results = await repository.query({
  sort: {
    fieldPath: "nested.prop.prop1",
    direction: "desc",
  },
});
```

Also the underlying type that represents the `sort` property has been renamed from `PropertySort` to `FieldSort` and no longer accepts a generic arg.
