---
"@mondomob/gae-js-datastore": minor
---

Add reindexInBatches function that performs reindex operation in an efficient manner (using batch sizes of 200 by default) for large datasets. Also FIXES an issue where there was an unbounded Promise.all() in the existing reindex() function that would have caused issues. This now limits to a maximum of 20 promises at any one time.
