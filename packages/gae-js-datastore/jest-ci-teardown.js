module.exports = async () => {
  const emulator = global.__DATASTORE__;
  if (emulator) {
    console.log("Stopping datastore emulator");
    return emulator.stop();
  } else {
    console.log("No emulator found");
  }
};
