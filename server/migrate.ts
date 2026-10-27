import { readConfig } from "./config";
import { openStore, migrateApp } from "./database";
import { makeAuth } from "./auth";

const config = readConfig();
const store = await openStore(config);
try {
  await migrateApp(store);
  if (config.authConfigured) {
    await makeAuth(config, store, true);
    console.log("Application and Better Auth migrations complete.");
  } else
    console.log(
      "Application migrations complete. Configure Google OAuth and BETTER_AUTH_SECRET to migrate Better Auth tables.",
    );
} finally {
  await store.close();
}
