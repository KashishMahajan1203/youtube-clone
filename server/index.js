import dotenv from "dotenv";
import mongoose from "mongoose";
import { createServer } from "http";
import { createApp } from "./app.js";
import { initializeSocket } from "./socket.js";
import { isCloudStorageEnabled } from "./services/storage.js";
import { assertAuthConfig } from "./services/token.js";

dotenv.config();

const app = createApp();
const server = createServer(app);
initializeSocket(server);

/* ===============================
   SERVER
   =============================== */
assertAuthConfig();
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server successfully started on port ${PORT}`);
  isCloudStorageEnabled();
});

/* ===============================
   DATABASE
   =============================== */
mongoose
  .connect(process.env.DB_URL)
  .then(() => console.log("MongoDB connection established"))
  .catch((error) =>
    console.error("MongoDB connection failure:", error)
  );
