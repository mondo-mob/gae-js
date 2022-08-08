---
"@mondomob/gae-js-firestore": minor
---

Extend repository options to allow for values to be transformed before write or after read. This extends on work to transform dates, but now this also allows us to do arbitrary transformations. This also allows us to use custom date libs (e.g. Luxon) by writing our own version of TimestampedRepository in a repo and changing how transforms happen before write (e.g. convert from DateTime to Timestamp) or after read (e.g. convert from Timestamp to DateTime).
