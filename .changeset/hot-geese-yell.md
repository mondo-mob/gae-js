---
"@mondomob/gae-js-firestore": patch
---

Fix an issue where our option to skip timestamp updates with DISABLE_TIMESTAMP_UPDATE would fail by not setting createdAt and updatedAt on newly created entities. This flag now only disables overwriting existing updatedAt values. We always need to set these fields for new entities where they don't already have a valid date set for both fields.
