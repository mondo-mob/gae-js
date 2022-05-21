import * as t from "io-ts";
import { GaeJsCoreConfiguration } from "./schema";
import { initialiseConfiguration } from "./utils";
import { Provider } from "../util";

export class ConfigurationProvider<T extends GaeJsCoreConfiguration = any> extends Provider<T> {
  get<K extends T>(): K {
    return super.get() as K;
  }

  async init<K extends T>(validator: t.Type<K>): Promise<K> {
    this.set(await initialiseConfiguration(validator));
    return this.get<K>();
  }
}

export const configurationProvider = new ConfigurationProvider(
  undefined,
  "No Configuration instance found. Please initialise configurationProvider."
);
