import { Storage, StorageOptions } from "@google-cloud/storage";
import { Provider } from "@mondomob/gae-js-core";
import { connectStorage } from "./connect";

class StorageProvider extends Provider<Storage> {
  init(storageOrOptions?: Storage | StorageOptions): void {
    if (storageOrOptions instanceof Storage) {
      this.set(storageOrOptions);
    } else {
      this.set(connectStorage({ storageOptions: storageOrOptions }));
    }
  }
}

export const storageProvider = new StorageProvider(
  undefined,
  "No Storage instance found. Please initialise storageProvider."
);
