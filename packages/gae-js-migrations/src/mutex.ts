import { LazyProvider } from "@mondomob/gae-js-core";
import { MutexService } from "@mondomob/gae-js-firestore";

export const mutexServiceProvider = new LazyProvider(
  () =>
    new MutexService({
      defaultExpirySeconds: 5 * 60,
    })
);
