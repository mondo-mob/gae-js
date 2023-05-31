---
"@mondomob/gae-js-firestore": major
---

BREAKING: delete function no longer accepts varargs. Call with a single id, or an array.

- Replace `myRepository.delete("id1", "id2")` with `myRepository.delete(["id1", "id2"])`
- Replace `myRepository.delete(...myArray)` with `myRepository.delete(myArray)`

New feature to allow Precondition options (https://firebase.google.com/docs/firestore/reference/rest/v1/Precondition) to be specified during delete

- `myRepository.delete("id1", { exists: true })`. Will fail if "id1" does not exist
