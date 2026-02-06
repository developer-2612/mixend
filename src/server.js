import express from "express";
import dotenv from "dotenv";
import http from "node:http";
import { Server } from "socket.io";
import {
  startWhatsApp,
  stopWhatsApp,
  getWhatsAppState,
  whatsappEvents,
} from "./whatsapp.js";

dotenv.config();

const app = express();
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

const isLocalhostOrigin = (origin) =>
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const resolveOrigin = (origin) => {
  if (!origin) return FRONTEND_ORIGIN;
  if (FRONTEND_ORIGINS.has(origin) || isLocalhostOrigin(origin)) return origin;
  return FRONTEND_ORIGIN;
};

app.use((req, res, next) => {
  const origin = resolveOrigin(req.headers.origin);
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

app.get("/whatsapp/status", (req, res) => {
  const adminId = Number(req.query?.adminId);
  res.json(getWhatsAppState(Number.isFinite(adminId) ? adminId : undefined));
});

app.post("/whatsapp/start", async (req, res) => {
  try {
    const adminId = Number(req.body?.adminId);
    const result = await startWhatsApp(Number.isFinite(adminId) ? adminId : undefined);
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

app.post("/whatsapp/disconnect", async (req, res) => {
  try {
    const adminId = Number(req.body?.adminId);
    const result = await stopWhatsApp(Number.isFinite(adminId) ? adminId : undefined);
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

io.on("connection", (socket) => {
  const adminId = Number(socket.handshake.query?.adminId);
  if (Number.isFinite(adminId)) {
    const room = `admin:${adminId}`;
    socket.join(room);
    const state = getWhatsAppState(adminId);
    socket.emit("whatsapp:status", state);
    if (state.qrImage) {
      socket.emit("whatsapp:qr", state.qrImage);
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
  if (Number.isFinite(adminId)) {
    io.to(`admin:${adminId}`).emit("whatsapp:qr", payload.qrImage);
    return;
  }
  io.emit("whatsapp:qr", payload?.qrImage || payload);
});

let currentPort = BASE_PORT;

const startServer = (port) => {
  server.listen(port, () => {
    console.log(`🚀 Backend running on http://localhost:${port}`);
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
