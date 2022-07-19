import { LazyProvider } from "@mondomob/gae-js-core";
import { MutexService } from "@mondomob/gae-js-firestore";

export const mutexServiceProvider = new LazyProvider(
  () =>
    new MutexService({
      expirySeconds: 5 * 60,
    })
);
