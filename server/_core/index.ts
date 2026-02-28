import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust the reverse proxy so req.protocol reflects the real HTTPS connection.
  // Without this, isSecureRequest() returns false on proxied HTTPS, causing
  // the session cookie to be set with secure:false — which browsers reject
  // when sameSite:'none' is also set, creating an infinite sign-in loop.
  app.set("trust proxy", 1);

  // Parse cookies so req.cookies is populated for session authentication
  app.use(cookieParser());

  // ── Email Ingest Webhook ─────────────────────────────────────────────────────
  // Receives forwarded emails from monkhouse-newsletter@manus.bot
  // Accepts both JSON (from Manus task system) and plain text POST bodies
  app.post(
    "/api/ingest/email",
    express.json({ limit: "10mb" }),
    express.urlencoded({ limit: "10mb", extended: true }),
    express.text({ type: ["text/plain", "text/html"], limit: "10mb" }),
    async (req, res) => {
      try {
        const body =
          typeof req.body === "string"
            ? { rawText: req.body, text: req.body }
            : req.body ?? {};
        const subject = body.subject ?? body.Subject ?? "(no subject)";
        const fromAddress = body.from ?? body.From ?? body.sender ?? "";
        const fromName = body.fromName ?? body.from_name ?? "";
        const rawText = body.text ?? body.body ?? body.rawText ?? body.content ?? JSON.stringify(body);
        const rawHtml = body.html ?? body.rawHtml ?? null;

        const { insertRawEmail: insertFn } = await import("../db.js");
        const email = await insertFn({ subject, fromAddress, fromName, rawText, rawHtml });

        res.json({ success: true, id: email.id });
      } catch (err) {
        console.error("[Email Ingest] Error:", err);
        res.status(500).json({ success: false, error: String(err) });
      }
    }
  );

  // Keep global parser limits tight; large payloads must use route-specific parsers.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "256kb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
