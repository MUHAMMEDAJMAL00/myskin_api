const { initializeDatabase } = require("./config/database");
const env = require("./config/env");
const app = require("./app");

// --- Load all models and associations ----------------------------------------
require("./database/index");

// ─── Run startup tasks after DB is connected ────────────────────────────────
const { cleanupExpiredDiscounts } = require("./modules/discounts/discount.service");

const PORT_RETRY_LIMIT = 10;

function listen(appInstance, port) {
  return new Promise((resolve, reject) => {
    const server = appInstance.listen(port, "0.0.0.0");

    server.once("listening", () => {
      resolve(server);
    });

    server.once("error", (error) => {
      reject(error);
    });
  });
}

async function listenWithRetry(appInstance, preferredPort) {
  for (
    let port = preferredPort;
    port <= preferredPort + PORT_RETRY_LIMIT;
    port += 1
  ) {
    try {
      const server = await listen(appInstance, port);
      return { server, port };
    } catch (error) {
      if (
        error.code !== "EADDRINUSE" ||
        !env.isDev ||
        port === preferredPort + PORT_RETRY_LIMIT
      ) {
        throw error;
      }

      console.warn(`Port ${port} is already in use. Trying ${port + 1}...`);
    }
  }

  throw new Error(
    `No available port found from ${preferredPort} to ${preferredPort + PORT_RETRY_LIMIT}.`,
  );
}

async function startServer() {
  let server;

  try {
    await initializeDatabase();

    // Auto-deactivate expired discounts
    cleanupExpiredDiscounts().catch((err) =>
      console.error("[STARTUP] Discount cleanup failed:", err.message),
    );

    const result = await listenWithRetry(app, env.port);
    server = result.server;

    console.log(`? MySkin API running ? http://localhost:${result.port}`);
    console.log(`? Environment ? ${env.node_env}`);
    console.log(`? Health check ? http://localhost:${result.port}/health`);
  } catch (error) {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${env.port} is already in use. Stop the other server or set PORT to another value.`,
      );
    } else {
      console.error("Failed to start server:", error);
    }

    process.exit(1);
  }

  process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down gracefully...");

    if (!server) {
      process.exit(0);
    }

    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  });
}

startServer();
