import { cors } from "@elysiajs/cors";
import { auth } from "auth";
import { Elysia } from "elysia";
import { handleDebug } from "./routes/debug";
import { handleHealth } from "./routes/health";
import { handleManifest } from "./routes/manifest";
import { handleWebviewEnter } from "./routes/webview-enter";

const PORT = Number(process.env.PORT) || 3001;

const app = new Elysia()
  .use(cors({ origin: true, credentials: true }))
  // Forward all better-auth API routes to the native better-auth handler
  .all("/api/auth/*", async ({ request }) => {
    return auth.handler(request);
  })
  // Custom routes
  .get("/api/health", ({ request }) => handleHealth(request))
  .get("/api/manifest", ({ request }) => handleManifest(request))
  .get("/webview/enter", ({ request }) => handleWebviewEnter(request))
  .get("/debug", ({ request }) => handleDebug(request));

// Start the server
app.listen(PORT, () => {
  console.log(`Backend running on :${PORT}`);
});

export { app };
