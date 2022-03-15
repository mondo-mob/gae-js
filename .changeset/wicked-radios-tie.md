---
"@mondomob/gae-js-firestore": patch
---

TimestampedRepository newTimestampEntity() helper now populates the timestamp fields with a flag that is replaced on first save.
This means that createdAt and updatedAt will be the same instant and createdAt will reflect the instant the entity was saved rather
than when the object was instantiated.
