import { Storage, StorageOptions } from "@google-cloud/storage";
import { Provider } from "@dotrun/gae-js-core";
import { connectStorage } from "./connect";

class StorageProvider extends Provider<Storage> {
  init(storageOrOptions?: Storage | StorageOptions): void {
    if (storageOrOptions instanceof Storage) {
      this.set(storageOrOptions);
    } else {
      this.set(connectStorage(storageOrOptions));
    }
  }
}

export const storageProvider = new StorageProvider();
