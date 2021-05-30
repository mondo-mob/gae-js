const DataStoreEmulator = require("google-datastore-emulator");

module.exports = async () => {
  const emulator = new DataStoreEmulator({
    port: 8081,
    project: "gae-js-datastore-tests",
    storeOnDisk: false,
  });
  console.log("Starting datastore emulator...");
  try {
    const start = Date.now();
    await emulator.start();
    console.log(`Datastore emulator started in ${Date.now() - start}ms`);
    global.__DATASTORE__ = emulator;
  } catch (e) {
    console.error("Error starting emulator", e);
    return emulator.stop();
  }
};
