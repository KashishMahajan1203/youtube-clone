// Test harness: the real Express app + Socket.IO on a random port, backed by
// an in-memory MongoDB. Each test file gets its own isolated database.
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { io as ioClient } from "socket.io-client";

import { createApp } from "../app.js";
import { initializeSocket } from "../socket.js";
import { signToken } from "../services/token.js";
import users from "../Modals/Auth.js";

const UPLOADS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "uploads");
export const TEST_FILE_TAG = "zz-test-";

export async function startTestServer() {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());

  const server = createServer(createApp({ logRequests: false }));
  initializeSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://localhost:${server.address().port}`;
  const sockets = [];

  /** JSON request; pass `token` to authenticate. */
  async function api(method, url, { token, body } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base + url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* non-JSON response */
    }
    return { status: res.status, data };
  }

  /** Multipart upload of a tiny fake video (+ optional thumbnail). */
  async function upload(token, fields = {}, { thumbnail = false } = {}) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    fd.append("file", new Blob([new Uint8Array(16)], { type: "video/mp4" }), `${TEST_FILE_TAG}video.mp4`);
    if (thumbnail) {
      fd.append("thumbnail", new Blob([new Uint8Array(16)], { type: "image/jpeg" }), `${TEST_FILE_TAG}thumb.jpg`);
    }
    const res = await fetch(`${base}/video/upload`, {
      method: "POST",
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return { status: res.status };
  }

  /** Creates a user and returns it with a session token. */
  async function createUser(data) {
    const user = await users.create({ email: `${Math.random().toString(36).slice(2)}@test.io`, ...data });
    return { user, id: String(user._id), token: signToken(user._id) };
  }

  /** A connected socket registered for a user's notifications; collects events. */
  async function listen(token) {
    const socket = ioClient(base, { transports: ["websocket"], forceNew: true });
    sockets.push(socket);
    await new Promise((resolve) => socket.on("connect", resolve));
    const received = [];
    socket.on("notification", (n) => received.push(n));
    socket.emit("register", token);
    await wait(100);
    return received;
  }

  async function stop() {
    sockets.forEach((s) => s.close());
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mem.stop();
    // Remove files written by upload tests.
    if (fs.existsSync(UPLOADS)) {
      for (const f of fs.readdirSync(UPLOADS)) {
        if (f.includes(TEST_FILE_TAG)) fs.unlinkSync(path.join(UPLOADS, f));
      }
    }
  }

  return { base, api, upload, createUser, listen, stop };
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
