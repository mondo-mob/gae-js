---
"@mondomob/gae-js-firestore": minor
---

Firestore repository improvements

- getRequired() can accept array of ids to return array of required entities (failing if any not resolved)
- Fix typing for get(ids: string[]) as entries within can also be null
