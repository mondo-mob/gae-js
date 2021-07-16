import { Firestore, Settings } from "@google-cloud/firestore";
import { configurationProvider, createLogger, isGcpEnvironment } from "@dotrun/gae-js-core";
import { GaeJsFirestoreConfiguration } from "../configuration";

export interface FirestoreConnectOptions {
  configuration?: GaeJsFirestoreConfiguration;
  firestoreSettings?: Settings;
}

export const connectFirestore = (options?: FirestoreConnectOptions): Firestore => {
  const logger = createLogger("connectFirestore");
  const configuration = options?.configuration || configurationProvider.get<GaeJsFirestoreConfiguration>();

  if (isGcpEnvironment()) {
    logger.info("Running in deployed environment");
    return new Firestore({
      projectId: configuration.firestoreProjectId || undefined,
      ...options?.firestoreSettings,
    });
  }

  const firestoreSettings: Settings = {
    projectId: configuration.firestoreProjectId,
    host: configuration.firestoreHost,
    port: configuration.firestorePort,
    ...options?.firestoreSettings,
  };
  logger.info(
    "Connecting to firestore in non-deployed environment: " +
      `${firestoreSettings.projectId}@${firestoreSettings.host}:${firestoreSettings.port}`
  );
  return new Firestore({
    ...firestoreSettings,
    ssl: false,
    credentials: { client_email: "firestore@example.com", private_key: "{}" },
  });
};
