let configuration: any;

export const configurationStore = {
  get: <T>(): T => {
    if (!configuration) {
      throw new Error("Application configuration not initialised");
    }
    return configuration;
  },
  set: <T>(config: T): void => {
    configuration = config;
  },
};
