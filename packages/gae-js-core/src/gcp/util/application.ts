import { Application } from "express";

/**
 * Common logic for starting and configuring an Express application server for running on GAE.
 * @param app the application to start
 */
export const startServer = (app: Application) => {
  const PORT = process.env.PORT || 8080;
  const server = app.listen(PORT, () => {
    console.log(`Server is running in http://localhost:${PORT}`);
  });

  // AppEngine auto-deploys nginx in front of our app with upstream keepalive_timeout=60s.
  // We need our timeout to be longer than that to avoid possible 502 errors (Node default is 5s)
  server.keepAliveTimeout = 65000;
  console.log(`Server keepAliveTimeout ${server.keepAliveTimeout}ms`);

  // Avoids "Start program failed" message when App Engine chooses to shut down servers
  // see: https://cloud.google.com/appengine/docs/standard/nodejs/how-instances-are-managed#shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received: stopping server");
    server.close(() => {
      console.log("Server stopped");
    });
  });
};
