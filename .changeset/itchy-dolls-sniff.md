---
"@mondomob/gae-js-storage": major
---

BREAKING: `emulatorHost` configuration renamed to `storageEmulatorHost`. Please update configuration accordingly.

New configuration property `storageOrigin` can be set to define a storage origin used when creating things like upload urls. The core configuration `host` property is used by default (if defined).