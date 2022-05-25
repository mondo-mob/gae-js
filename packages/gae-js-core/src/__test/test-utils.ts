import ProvidesCallback = jest.ProvidesCallback;

// NOTE: This will only work for code that does not inspect the process on initialisation
export const withEnvVars = (
  vars: Record<string, string | undefined>,
  testFn: () => Promise<unknown>
): ProvidesCallback => {
  return () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      ...vars,
    };
    return testFn().finally(() => {
      process.env = originalEnv;
    });
  };
};
