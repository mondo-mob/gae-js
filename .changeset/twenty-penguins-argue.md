---
"@mondomob/gae-js-firestore": minor
---

Fix support for connecting to non-emulator Firestore instances from outside GCP. 
i.e. if you do not specify a `host` in the configuration it will connect to the configured firestore projectId or application projectId. 

Add support for creating FirestoreAdminClients. This is useful for operations such as Document Exports.
