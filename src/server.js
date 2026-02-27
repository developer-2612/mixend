import express from "express";
import dotenv from "dotenv";
import http from "node:http";
import fs from "node:fs/promises";
import { Server } from "socket.io";
import { verifyAuthToken } from "../lib/auth.js";
import { consumeRateLimit, getClientIp } from "../lib/rate-limit.js";
import {
  startWhatsApp,
  stopWhatsApp,
  getWhatsAppState,
  whatsappEvents,
  sendAdminMessage,
} from "./whatsapp.js";

dotenv.config();

const app = express();
app.disable("x-powered-by");
app.use(express.json());

const DEFAULT_PORT = 3001;
const BASE_PORT = Number(process.env.PORT) || DEFAULT_PORT;
const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const FRONTEND_ORIGINS = new Set(
  (process.env.FRONTEND_ORIGINS || `${FRONTEND_ORIGIN},http://localhost:3001`)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const BACKEND_SCOPE = "backend";
const AUTH_REQUIRED_RESPONSE = { error: "Unauthorized" };
const FORBIDDEN_RESPONSE = { error: "Forbidden" };

const isLocalhostOrigin = (origin) =>
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const resolveOrigin = (origin) => {
  if (!origin) return FRONTEND_ORIGIN;
  if (FRONTEND_ORIGINS.has(origin) || isLocalhostOrigin(origin)) return origin;
  return FRONTEND_ORIGIN;
};

const parseToken = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^Bearer\s+/i.test(raw)) {
    return raw.replace(/^Bearer\s+/i, "").trim();
  }
  return raw;
};

const readAuthPayload = (rawToken) => {
  const token = parseToken(rawToken);
  if (!token) return null;
  const payload = verifyAuthToken(token);
  const id = Number(payload?.id);
  if (!payload || payload?.scope !== BACKEND_SCOPE || !Number.isFinite(id)) {
    return null;
  }
  return {
    id,
    admin_tier: String(payload?.admin_tier || "client_admin"),
  };
};

const canAccessAdmin = (authUser, adminId) => {
  if (!authUser || !Number.isFinite(adminId)) return false;
  return authUser.admin_tier === "super_admin" || authUser.id === adminId;
};

const authenticateBackendToken = (req, res, next) => {
  const authUser = readAuthPayload(req.headers?.authorization);
  if (!authUser) {
    res.status(401).json(AUTH_REQUIRED_RESPONSE);
    return;
  }
  req.authUser = authUser;
  next();
};

const enforceRouteRateLimit = (req, res, { key, limit, windowMs, blockMs = 0 }) => {
  const limiter = consumeRateLimit({
    storeKey: `backend:${key}`,
    key: `${req.authUser?.id || "unknown"}:${getClientIp(req)}`,
    limit,
    windowMs,
    blockMs,
  });
  if (limiter.allowed) return true;
  if (limiter.retryAfterSeconds) {
    res.setHeader("Retry-After", String(limiter.retryAfterSeconds));
  }
  res.status(429).json({ error: "Too many requests. Please try again later." });
  return false;
};

app.use((req, res, next) => {
  const origin = resolveOrigin(req.headers.origin);
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

app.get("/health/storage", async (req, res) => {
  if (process.env.DEBUG_STORAGE_CHECK !== "true") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const authPath = process.env.WHATSAPP_AUTH_PATH || ".wwebjs_auth";
  try {
    const stats = await fs.stat(authPath);
    const entries = await fs.readdir(authPath).catch(() => []);
    res.json({
      ok: true,
      authPath,
      exists: true,
      isDirectory: stats.isDirectory(),
      entryCount: entries.length,
      sampleEntries: entries.slice(0, 10),
    });
  } catch (err) {
    res.json({
      ok: false,
      authPath,
      exists: false,
      error: err?.message || "Unknown error",
    });
  }
});

app.get("/whatsapp/status", authenticateBackendToken, (req, res) => {
  if (!enforceRouteRateLimit(req, res, { key: "status", limit: 240, windowMs: 60_000 })) {
    return;
  }
  const requestedAdminId = Number(req.query?.adminId);
  const adminId = Number.isFinite(requestedAdminId) ? requestedAdminId : req.authUser.id;
  if (!canAccessAdmin(req.authUser, adminId)) {
    res.status(403).json(FORBIDDEN_RESPONSE);
    return;
  }
  res.json(getWhatsAppState(adminId));
});

app.post("/whatsapp/start", authenticateBackendToken, async (req, res) => {
  try {
    if (!enforceRouteRateLimit(req, res, { key: "start", limit: 12, windowMs: 10 * 60_000, blockMs: 10 * 60_000 })) {
      return;
    }
    const requestedAdminId = Number(req.body?.adminId);
    const adminId = Number.isFinite(requestedAdminId) ? requestedAdminId : req.authUser.id;
    if (!canAccessAdmin(req.authUser, adminId)) {
      res.status(403).json(FORBIDDEN_RESPONSE);
      return;
    }
    const result = await startWhatsApp(adminId);
    if (result?.error) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (err) {
    console.error("❌ Failed to start WhatsApp:", err);
    res.status(500).json({ error: "Failed to start WhatsApp" });
  }
});

app.post("/whatsapp/disconnect", authenticateBackendToken, async (req, res) => {
  try {
    if (!enforceRouteRateLimit(req, res, { key: "disconnect", limit: 12, windowMs: 10 * 60_000, blockMs: 10 * 60_000 })) {
      return;
    }
    const requestedAdminId = Number(req.body?.adminId);
    const adminId = Number.isFinite(requestedAdminId) ? requestedAdminId : req.authUser.id;
    if (!canAccessAdmin(req.authUser, adminId)) {
      res.status(403).json(FORBIDDEN_RESPONSE);
      return;
    }
    const result = await stopWhatsApp(adminId);
    if (result?.error) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (err) {
    console.error("❌ Failed to disconnect WhatsApp:", err);
    res.status(500).json({ error: "Failed to disconnect WhatsApp" });
  }
});

app.post("/whatsapp/send", authenticateBackendToken, async (req, res) => {
  try {
    if (!enforceRouteRateLimit(req, res, { key: "send", limit: 90, windowMs: 60_000, blockMs: 2 * 60_000 })) {
      return;
    }
    const requestedAdminId = Number(req.body?.adminId);
    const adminId = Number.isFinite(requestedAdminId) ? requestedAdminId : req.authUser.id;
    if (!canAccessAdmin(req.authUser, adminId)) {
      res.status(403).json(FORBIDDEN_RESPONSE);
      return;
    }
    const userId = Number(req.body?.userId);
    const message = String(req.body?.message || "").trim();
    const result = await sendAdminMessage({
      adminId,
      userId: Number.isFinite(userId) ? userId : undefined,
      text: message,
    });
    if (result?.error) {
      res.status(result.status || 400).json({ success: false, error: result.error, code: result.code });
      return;
    }
    res.json({ success: true, data: result?.data || null });
  } catch (err) {
    console.error("❌ Failed to send WhatsApp message:", err);
    res.status(500).json({ success: false, error: "Failed to send WhatsApp message" });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || FRONTEND_ORIGINS.has(origin) || isLocalhostOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
  },
});

io.use((socket, next) => {
  const authHeader = socket.handshake?.auth?.token || socket.handshake?.headers?.authorization;
  const authUser = readAuthPayload(authHeader);
  if (!authUser) {
    next(new Error("Unauthorized"));
    return;
  }

  const requestedAdminId = Number(socket.handshake?.query?.adminId);
  const adminId = Number.isFinite(requestedAdminId) ? requestedAdminId : authUser.id;
  if (!canAccessAdmin(authUser, adminId)) {
    next(new Error("Forbidden"));
    return;
  }

  socket.data.authUser = authUser;
  socket.data.adminId = adminId;
  next();
});

const enableRedisAdapter = async (ioServer) => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return;
  try {
    const { createClient } = await import("redis");
    const { createAdapter } = await import("@socket.io/redis-adapter");
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    ioServer.adapter(createAdapter(pubClient, subClient));
    console.log("✅ Socket.IO Redis adapter enabled");
  } catch (err) {
    console.warn("⚠️ Redis adapter not enabled:", err?.message || err);
  }
};

await enableRedisAdapter(io);

io.on("connection", (socket) => {
  const adminId = Number(socket.data?.adminId);
  if (Number.isFinite(adminId)) {
    const room = `admin:${adminId}`;
    socket.join(room);
    const state = getWhatsAppState(adminId);
    socket.emit("whatsapp:status", state);
    if (state.qrImage) {
      socket.emit("whatsapp:qr", { qrImage: state.qrImage });
    }
  } else {
    socket.emit("whatsapp:status", getWhatsAppState());
  }
});

whatsappEvents.on("status", (payload) => {
  const adminId = Number(payload?.adminId);
  if (Number.isFinite(adminId)) {
    io.to(`admin:${adminId}`).emit("whatsapp:status", payload);
    return;
  }
  io.emit("whatsapp:status", payload);
});

whatsappEvents.on("qr", (payload) => {
  const adminId = Number(payload?.adminId);
  const qrPayload =
    payload && typeof payload === "object"
      ? { qr: payload.qr, qrImage: payload.qrImage }
      : payload;
  if (Number.isFinite(adminId)) {
    io.to(`admin:${adminId}`).emit("whatsapp:qr", qrPayload);
    return;
  }
  io.emit("whatsapp:qr", qrPayload);
});

let currentPort = BASE_PORT;

const startServer = (port) => {
  server.listen(port, () => {
    const publicUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL;
    const normalized =
      publicUrl && publicUrl.endsWith("/") ? publicUrl.slice(0, -1) : publicUrl;
    const logUrl = normalized || `http://localhost:${port}`;
    console.log(`🚀 Backend running on ${logUrl}`);
  });
};

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    const nextPort = currentPort + 1;
    console.warn(`⚠️ Port ${currentPort} in use, trying ${nextPort}...`);
    currentPort = nextPort;
    setTimeout(() => startServer(currentPort), 200);
    return;
  }
  console.error("❌ Server error:", err);
  process.exit(1);
});

startServer(currentPort);
