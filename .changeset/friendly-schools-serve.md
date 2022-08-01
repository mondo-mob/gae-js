---
"@mondomob/gae-js-firestore": major
---

BREAKING: New hook 'afterRead' introduced to allow transformations on data read from Firestore - with default behaviour to convert firestore Timestamps to Dates.
BREAKING: TimestampedEntity now stores dates as Dates (not strings). Migrate your existing TimestampedEntity docs/entities.
BREAKING: Mutex now stores dates as Dates (not strings). Purge (or migrate) your existing Mutex docs/entities.
firestore-repository now accepts a DataValidator to bring it into line with datastore-repository.

