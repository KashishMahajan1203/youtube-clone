import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import downloadroutes from "./routes/download.js";
import subscriptionroutes from "./routes/subscription.js";
import notificationroutes from "./routes/notification.js";
import playlistroutes from "./routes/playlist.js";
import studioroutes from "./routes/studio.js";
import youtuberoutes from "./routes/youtube.js";
import { getAllowedOrigins } from "./constants/origins.js";

// Required for ES Modules (__dirname replacement)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Build the Express app without starting a server or connecting to the
 * database, so tests can run it against an in-memory MongoDB.
 */
export function createApp({ logRequests = true } = {}) {
  const app = express();
  // Behind Render/other proxies req.ip should be the client, not the proxy
  // (used to de-duplicate anonymous views).
  app.set("trust proxy", 1);

  /* ===============================
     LOGGING
     =============================== */
  if (logRequests) {
    app.use((req, res, next) => {
      console.log(`[${req.method}] ${req.url}`);
      next();
    });
  }

  /* ===============================
     SECURITY HEADERS
     =============================== */
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
    next();
  });

  /* ===============================
     CORS
     =============================== */
  app.use(
    cors({
      origin: getAllowedOrigins(),
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  /* ===============================
     BODY PARSERS
     =============================== */
  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ limit: "30mb", extended: true }));

  /* ===============================
     STATIC FILES
     =============================== */
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  /* ===============================
     HEALTH CHECK
     =============================== */
  app.get("/", (req, res) => {
    res.status(200).send("YouTube backend is operational");
  });

  /* ===============================
     ROUTES
     =============================== */
  app.use("/user", userroutes);
  app.use("/video", videoroutes);
  app.use("/like", likeroutes);
  app.use("/watch", watchlaterroutes);
  app.use("/history", historyroutes);
  app.use("/comment", commentroutes);
  app.use("/download", downloadroutes);
  app.use("/subscription", subscriptionroutes);
  app.use("/notification", notificationroutes);
  app.use("/playlist", playlistroutes);
  app.use("/studio", studioroutes);
  app.use("/youtube", youtuberoutes);

  return app;
}
