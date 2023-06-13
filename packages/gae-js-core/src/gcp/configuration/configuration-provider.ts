import { GaeJsCoreConfiguration } from "./schema";
import { Provider } from "../../util";
import { ConfigurationOptions, initialiseConfiguration } from "./configuration";

export class ConfigurationProvider<T extends GaeJsCoreConfiguration = any> extends Provider<T> {
  get<K extends T>(): K {
    return super.get() as K;
  }

  async init<K extends T>(options: ConfigurationOptions<K>): Promise<K> {
    this.set(await initialiseConfiguration(options));
    return this.get<K>();
  }
}

export const configurationProvider = new ConfigurationProvider(
  undefined,
  "No Configuration instance found. Please initialise configurationProvider."
);
