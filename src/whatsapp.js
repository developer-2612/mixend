import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import qrImage from "qrcode";
import { EventEmitter } from "node:events";
import {
  addDays,
  addMinutes,
  addMonths,
  format,
  isAfter,
  isBefore,
  isValid,
  parse,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns";
import { db } from "./db.js";
import {
  sanitizeEmail,
  sanitizeNameUpper,
  sanitizePhone,
  sanitizeText,
} from "../lib/sanitize.js";

const { Client, LocalAuth } = pkg;
export const whatsappEvents = new EventEmitter();

/* ===============================
   MULTI-ADMIN WHATSAPP SESSIONS
   =============================== */
const sessions = new Map();
const MAX_SESSIONS = Number(process.env.WHATSAPP_MAX_SESSIONS || 5);
const USER_IDLE_TTL_MS = Number(process.env.WHATSAPP_USER_IDLE_TTL_MS || 6 * 60 * 60 * 1000);
const SESSION_IDLE_TTL_MS = Number(process.env.WHATSAPP_SESSION_IDLE_TTL_MS || 6 * 60 * 60 * 1000);
const CLEANUP_INTERVAL_MS = Number(process.env.WHATSAPP_CLEANUP_INTERVAL_MS || 15 * 60 * 1000);

const touchSession = (session) => {
  if (!session?.state) return;
  session.state.lastActivityAt = Date.now();
};

const cleanupSessions = () => {
  const now = Date.now();
  for (const [adminId, session] of sessions.entries()) {
    if (!session) continue;

    const users = session.users || {};
    for (const [key, user] of Object.entries(users)) {
      const lastSeen = user?.lastUserMessageAt || 0;
      if (lastSeen && now - lastSeen > USER_IDLE_TTL_MS) {
        if (user?.idleTimer) {
          clearTimeout(user.idleTimer);
        }
        delete users[key];
      }
    }

    const lastActive = session.state?.lastActivityAt || 0;
    if (!session.state?.isReady && session.state?.hasStarted && lastActive && now - lastActive > SESSION_IDLE_TTL_MS) {
      try {
        session.client?.destroy?.();
      } catch (err) {
        console.warn("⚠️ Failed to destroy idle WhatsApp session:", err?.message || err);
      }
      sessions.delete(adminId);
    }
  }
};

const cleanupTimer = setInterval(cleanupSessions, CLEANUP_INTERVAL_MS);
if (cleanupTimer.unref) cleanupTimer.unref();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const AI_SETTINGS_TTL_MS = Number(process.env.AI_SETTINGS_TTL_MS || 60_000);
const aiSettingsCache = new Map();
const DUPLICATE_WINDOW_MS = Number(process.env.WHATSAPP_DUP_WINDOW_MS || 10_000);
const recentMessageIds = new Map();
const ADMIN_PROFILE_TTL_MS = Number(process.env.ADMIN_PROFILE_TTL_MS || 60_000);
const adminProfileCache = new Map();
const ADMIN_CATALOG_TTL_MS = Number(process.env.ADMIN_CATALOG_TTL_MS || 60_000);
const adminCatalogCache = new Map();

const getMessageKey = (message) => {
  const serialized = message?.id?._serialized || message?.id?.id;
  if (serialized) return serialized;
  const from = message?.from || "unknown";
  const ts = message?.timestamp || Date.now();
  const body = message?.body ? String(message.body).slice(0, 50) : "";
  return `${from}:${ts}:${body}`;
};

const isDuplicateMessage = (message) => {
  const key = getMessageKey(message);
  const now = Date.now();
  const lastSeen = recentMessageIds.get(key);
  if (lastSeen && now - lastSeen < DUPLICATE_WINDOW_MS) {
    return true;
  }
  recentMessageIds.set(key, now);
  return false;
};

const pruneRecentMessages = () => {
  const now = Date.now();
  for (const [key, ts] of recentMessageIds.entries()) {
    if (now - ts > DUPLICATE_WINDOW_MS * 2) {
      recentMessageIds.delete(key);
    }
  }
};

const recentCleanup = setInterval(pruneRecentMessages, DUPLICATE_WINDOW_MS);
if (recentCleanup.unref) recentCleanup.unref();

const getAdminAISettings = async (adminId) => {
  if (!Number.isFinite(adminId)) return null;
  const cached = aiSettingsCache.get(adminId);
  const now = Date.now();
  if (cached && now - cached.at < AI_SETTINGS_TTL_MS) {
    return cached.data;
  }
  const [rows] = await db.query(
    `SELECT ai_enabled, ai_prompt, ai_blocklist
     FROM admins
     WHERE id = ?
     LIMIT 1`,
    [adminId]
  );
  const data = rows[0] || { ai_enabled: false, ai_prompt: null, ai_blocklist: null };
  aiSettingsCache.set(adminId, { at: now, data });
  return data;
};

const getAdminAutomationProfile = async (adminId) => {
  if (!Number.isFinite(adminId)) return null;
  const cached = adminProfileCache.get(adminId);
  const now = Date.now();
  if (cached && now - cached.at < ADMIN_PROFILE_TTL_MS) {
    return cached.data;
  }
  const [rows] = await db.query(
    `SELECT profession
     FROM admins
     WHERE id = ?
     LIMIT 1`,
    [adminId]
  );
  const data = rows[0] || { profession: DEFAULT_PROFESSION };
  adminProfileCache.set(adminId, { at: now, data });
  return data;
};

const MAIN_MENU_KEYWORDS = ["menu", "main menu", "back", "home", "मुख्य मेनू", "मेनू"];
const EXECUTIVE_KEYWORDS = [
  "executive",
  "agent",
  "human",
  "call",
  "talk",
  "support",
  "baat",
  "help",
];

const parseCatalogKeywords = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,;\n]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const buildOptionKeywords = (item) => {
  const keywords = new Set();
  parseCatalogKeywords(item.keywords).forEach((keyword) =>
    keywords.add(keyword.toLowerCase())
  );
  if (item.name) {
    const name = String(item.name).toLowerCase();
    keywords.add(name);
    name
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 2)
      .forEach((word) => keywords.add(word));
  }
  if (item.category) {
    const category = String(item.category).toLowerCase();
    keywords.add(category);
  }
  return Array.from(keywords).filter(Boolean);
};

const formatMenuLine = (index, item) => {
  const parts = [`${index}️⃣ ${item.name}`];
  if (item.price_label) parts.push(`- ${item.price_label}`);
  if (item.item_type === "service" && item.duration_minutes) {
    parts.push(`(${item.duration_minutes} min)`);
  }
  return parts.join(" ");
};

const buildCatalogMenuText = ({
  title,
  items,
  footer,
  includeExecutive = false,
  execLabel = "Talk to Executive",
  includeMainMenu = true,
}) => {
  const lines = [title];
  if (!items.length) {
    lines.push("_No items available right now._");
  } else {
    items.forEach((item, idx) => {
      lines.push(formatMenuLine(idx + 1, item));
    });
  }

  let nextIndex = items.length + 1;
  if (includeExecutive) {
    lines.push(`${nextIndex}️⃣ ${execLabel}`);
    nextIndex += 1;
  }
  if (includeMainMenu) {
    lines.push(`${nextIndex}️⃣ Main Menu`);
  }

  if (footer) {
    lines.push("");
    lines.push(footer);
  }
  return lines.join("\n");
};

const getAdminCatalogItems = async (adminId) => {
  if (!Number.isFinite(adminId)) {
    return { services: [], products: [], hasCatalog: false };
  }
  const cached = adminCatalogCache.get(adminId);
  const now = Date.now();
  if (cached && now - cached.at < ADMIN_CATALOG_TTL_MS) {
    return cached.data;
  }

  try {
    const [rows] = await db.query(
      `SELECT id, item_type, name, category, description, price_label, duration_minutes, details_prompt, keywords, is_active, sort_order, is_bookable
       FROM catalog_items
       WHERE admin_id = ?
       ORDER BY sort_order ASC, name ASC, id ASC`,
      [adminId]
    );

    const hasCatalog = rows.length > 0;
    const active = rows.filter((row) => row.is_active);
    const services = active.filter((row) => row.item_type === "service");
    const products = active.filter((row) => row.item_type === "product");

    const data = { services, products, hasCatalog };
    adminCatalogCache.set(adminId, { at: now, data });
    return data;
  } catch (error) {
    console.error("❌ Failed to load admin catalog:", error.message);
    const data = { services: [], products: [], hasCatalog: false };
    adminCatalogCache.set(adminId, { at: now, data });
    return data;
  }
};

const buildCatalogAutomation = ({ baseAutomation, catalog }) => {
  if (!catalog?.hasCatalog) return baseAutomation;

  const nextAutomation = { ...baseAutomation };

  const serviceLabel = baseAutomation.serviceLabel || "Services";
  const productLabel = baseAutomation.productLabel || "Products";
  const execLabel = baseAutomation.execLabel || "Talk to Executive";

  const serviceOptions = [];
  const serviceItems = catalog.services || [];
  serviceItems.forEach((item, idx) => {
    serviceOptions.push({
      id: `service_${item.id}`,
      number: String(idx + 1),
      label: item.name,
      keywords: buildOptionKeywords(item),
      prompt: item.details_prompt,
      bookable: baseAutomation.supportsAppointments ? Boolean(item.is_bookable) : false,
    });
  });
  serviceOptions.push({
    id: "executive",
    number: String(serviceItems.length + 1),
    label: execLabel,
    keywords: EXECUTIVE_KEYWORDS,
  });
  serviceOptions.push({
    id: "main_menu",
    number: String(serviceItems.length + 2),
    label: "Main Menu",
    keywords: MAIN_MENU_KEYWORDS,
  });

  const productOptions = [];
  const productItems = catalog.products || [];
  productItems.forEach((item, idx) => {
    productOptions.push({
      id: `product_${item.id}`,
      number: String(idx + 1),
      label: item.name,
      keywords: buildOptionKeywords(item),
      prompt: item.details_prompt,
    });
  });
  productOptions.push({
    id: "main_menu",
    number: String(productItems.length + 1),
    label: "Main Menu",
    keywords: MAIN_MENU_KEYWORDS,
  });

  nextAutomation.servicesMenuText = buildCatalogMenuText({
    title: `${serviceLabel}:`,
    items: serviceItems,
    footer: "_Reply with a number or type the service name_",
    includeExecutive: true,
    execLabel,
    includeMainMenu: true,
  });
  nextAutomation.productsMenuText = buildCatalogMenuText({
    title: `${productLabel}:`,
    items: productItems,
    footer: "_Reply with a number or type the product name_",
    includeExecutive: false,
    includeMainMenu: true,
  });
  nextAutomation.serviceOptions = serviceOptions;
  nextAutomation.productOptions = productOptions;

  return nextAutomation;
};

const buildSystemPrompt = ({ aiPrompt, aiBlocklist }) => {
  const parts = [
    "You are a helpful WhatsApp assistant for AlgoAura.",
    "Be concise, friendly, and professional.",
    "If a request is unclear, ask a short clarifying question.",
    "Never claim you performed actions you did not do.",
  ];
  if (aiPrompt && aiPrompt.trim()) {
    parts.push(`Allowed topics / guidance: ${aiPrompt.trim()}`);
  }
  if (aiBlocklist && aiBlocklist.trim()) {
    parts.push(`Do NOT discuss: ${aiBlocklist.trim()}. If asked, politely refuse and offer allowed help.`);
  }
  return parts.join("\n");
};

const fetchAIReply = async ({ aiPrompt, aiBlocklist, userMessage }) => {
  if (!OPENROUTER_API_KEY) {
    return null;
  }
  const systemPrompt = buildSystemPrompt({ aiPrompt, aiBlocklist });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.4,
      }),
      signal: controller.signal,
    });
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" ? text.trim() : null;
  } catch (err) {
    console.warn("⚠️ OpenRouter reply failed:", err?.message || err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const AUTH_DATA_PATH = process.env.WHATSAPP_AUTH_PATH || ".wwebjs_auth";
const PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH;

const createClient = (adminId) =>
  new Client({
    authStrategy: new LocalAuth({
      clientId: `admin-${adminId}`,
      dataPath: AUTH_DATA_PATH,
    }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ...(PUPPETEER_EXECUTABLE_PATH
        ? { executablePath: PUPPETEER_EXECUTABLE_PATH }
        : {}),
    },
  });

const buildStateResponse = (session) => ({
  status: session.state.status,
  ready: session.state.isReady,
  qrImage: session.state.latestQrImage,
  activeAdminId: session.adminId,
  activeAdminNumber: session.state.activeAdminNumber,
  activeAdminName: session.state.activeAdminName,
});

const updateAdminWhatsAppDetails = async (session) => {
  if (!session?.adminId) return;
  const info = session.client.info || {};
  const widUser = info?.wid?.user || session.state.activeAdminNumber;
  const displayName =
    info?.pushname || info?.displayName || session.state.activeAdminName;
  session.state.activeAdminNumber = widUser;
  session.state.activeAdminName = displayName;
  await db.query(
    `UPDATE admins
     SET whatsapp_number = ?, whatsapp_name = ?, whatsapp_connected_at = NOW()
     WHERE id = ?`,
    [session.state.activeAdminNumber, session.state.activeAdminName, session.adminId]
  );
};

const emitStatus = (session, nextStatus) => {
  session.state.status = nextStatus;
  touchSession(session);
  whatsappEvents.emit("status", {
    adminId: session.adminId,
    ...buildStateResponse(session),
  });
};

const emitQr = (session, payload) => {
  touchSession(session);
  whatsappEvents.emit("qr", { adminId: session.adminId, ...payload });
};

const attachClientEvents = (session) => {
  const { client } = session;

  client.on("qr", async (qr) => {
    emitStatus(session, "qr");
    session.state.isReady = false;
    session.state.latestQrImage = null;
    console.log(`📱 Scan the QR code (admin ${session.adminId})`);
    qrcode.generate(qr, { small: true });
    emitQr(session, { qr });
    try {
      session.state.latestQrImage = await qrImage.toDataURL(qr);
      emitQr(session, { qr, qrImage: session.state.latestQrImage });
    } catch (err) {
      console.error("❌ QR generation failed:", err);
    }
  });

  client.on("ready", () => {
    session.state.isReady = true;
    session.state.latestQrImage = null;
    emitStatus(session, "connected");
    console.log(`✅ WhatsApp Ready (admin ${session.adminId})`);
    updateAdminWhatsAppDetails(session).catch((err) => {
      console.error("❌ Failed to update admin WhatsApp details:", err.message);
    });
    recoverPendingMessages(session).catch((err) => {
      console.error("❌ Failed to recover pending messages:", err.message);
    });
  });

  client.on("disconnected", () => {
    session.state.isReady = false;
    emitStatus(session, "disconnected");
    console.log(`⚠️ WhatsApp disconnected (admin ${session.adminId})`);
    session.state.activeAdminNumber = null;
    session.state.activeAdminName = null;
  });

  client.on("auth_failure", () => {
    session.state.isReady = false;
    emitStatus(session, "auth_failure");
    console.log(`❌ WhatsApp auth failure (admin ${session.adminId})`);
  });

  attachAutomationHandlers(session);
};

const createSession = (adminId) => {
  const session = {
    adminId,
    client: createClient(adminId),
    state: {
      isReady: false,
      hasStarted: false,
      status: "idle",
      latestQrImage: null,
      activeAdminNumber: null,
      activeAdminName: null,
      lastActivityAt: Date.now(),
    },
    users: Object.create(null),
  };
  sessions.set(adminId, session);
  attachClientEvents(session);
  return session;
};

export const startWhatsApp = async (adminId) => {
  if (!Number.isFinite(adminId)) {
    return { status: "idle", alreadyStarted: false, error: "adminId required" };
  }
  const existingSession = sessions.get(adminId);
  if (!existingSession && sessions.size >= MAX_SESSIONS) {
    return {
      status: "idle",
      alreadyStarted: false,
      error: `Max WhatsApp sessions reached (${MAX_SESSIONS}).`,
    };
  }
  const session = existingSession || createSession(adminId);

  if (session.state.hasStarted) {
    return { ...buildStateResponse(session), alreadyStarted: true };
  }

  session.state.hasStarted = true;
  touchSession(session);
  emitStatus(session, "starting");
  try {
    await session.client.initialize();
    return { ...buildStateResponse(session), alreadyStarted: false };
  } catch (err) {
    session.state.hasStarted = false;
    emitStatus(session, "error");
    throw err;
  }
};

export const stopWhatsApp = async (adminId) => {
  if (!Number.isFinite(adminId)) {
    return { status: "idle", alreadyStarted: false, error: "adminId required" };
  }
  const session = sessions.get(adminId);
  if (!session || !session.state.hasStarted) {
    return {
      status: session?.state.status || "idle",
      alreadyStarted: false,
      activeAdminId: adminId,
    };
  }

  try {
    await session.client.destroy();
  } finally {
    Object.values(session.users || {}).forEach((user) => {
      if (user?.idleTimer) {
        clearTimeout(user.idleTimer);
      }
    });
    touchSession(session);
    session.state.hasStarted = false;
    session.state.isReady = false;
    session.state.latestQrImage = null;
    session.state.activeAdminNumber = null;
    session.state.activeAdminName = null;
    emitStatus(session, "disconnected");
    sessions.delete(adminId);
  }
  return { ...buildStateResponse(session), alreadyStarted: true };
};

export const getWhatsAppState = (adminId) => {
  if (!Number.isFinite(adminId)) {
    return {
      status: "idle",
      ready: false,
      qrImage: null,
      activeAdminId: null,
      activeAdminNumber: null,
      activeAdminName: null,
    };
  }
  const session = sessions.get(adminId);
  if (!session) {
    return {
      status: "idle",
      ready: false,
      qrImage: null,
      activeAdminId: adminId,
      activeAdminNumber: null,
      activeAdminName: null,
    };
  }
  return buildStateResponse(session);
};

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/* ===============================
   🤖 BOT CONTENT & HELPERS
   =============================== */
const TWO_MINUTES_MS = 2 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const APPOINTMENT_START_HOUR = Number(process.env.APPOINTMENT_START_HOUR || 9);
const APPOINTMENT_END_HOUR = Number(process.env.APPOINTMENT_END_HOUR || 20);
const APPOINTMENT_SLOT_MINUTES = Number(process.env.APPOINTMENT_SLOT_MINUTES || 60);
const APPOINTMENT_WINDOW_MONTHS = Number(process.env.APPOINTMENT_WINDOW_MONTHS || 3);

const DEFAULT_PROFESSION = "astrology";

const buildMainMenuText = ({ brandName, serviceLabel, productLabel, execLabel }) =>
  [
    "Namaste/Hello 🙏",
    `I am a helper bot for *${brandName}*.`,
    "",
    "How can I help you today?",
    "",
    `1️⃣ ${serviceLabel}`,
    `2️⃣ ${productLabel}`,
    `3️⃣ ${execLabel}`,
    "",
    "_Reply with 1, 2, or 3, or type your need_",
  ].join("\n");

const buildReturningMenuText = ({ serviceLabel, productLabel, execLabel }, name) =>
  [
    `Welcome back ${name} 👋`,
    "",
    "How can we help you today?",
    "",
    `1️⃣ ${serviceLabel}`,
    `2️⃣ ${productLabel}`,
    `3️⃣ ${execLabel}`,
    "",
    "_Reply with 1, 2, or 3, or type your need_",
  ].join("\n");

const buildDetectMainIntent =
  ({ serviceKeywords = [], productKeywords = [] }) =>
  (input) => {
    const execKeywords = ["executive", "agent", "human", "call", "talk", "support", "baat"];
    if (textHasAny(input, execKeywords)) return "EXECUTIVE";

    const wantsService = textHasAny(input, serviceKeywords);
    const wantsProduct = textHasAny(input, productKeywords);

    if (wantsService && !wantsProduct) return "SERVICES";
    if (wantsProduct && !wantsService) return "PRODUCTS";
    return null;
  };

const ASTROLOGY_PROFILE = {
  id: "astrology",
  brandName: "Neeraj Astrology",
  serviceLabel: "Services (सेवाएं)",
  productLabel: "Products / Stones (प्रोडक्ट्स / रत्न)",
  execLabel: "Talk to an Executive (एक्सपर्ट से बात)",
  supportsAppointments: true,
  appointmentKeywords: ["appointment", "consultation", "booking", "schedule", "meet"],
  mainMenuText: [
    "Namaste/Hello 🙏",
    "I am a helper bot for *Neeraj Astrology*.",
    "",
    "How can I help you today? / Aaj aapko kis cheez me madad chahiye?",
    "",
    "1️⃣ Services (सेवाएं)",
    "2️⃣ Products / Stones (प्रोडक्ट्स / रत्न)",
    "3️⃣ Talk to an Executive (एक्सपर्ट से बात)",
    "",
    "_Reply with 1, 2, or 3, or type your need_",
  ].join("\n"),
  returningMenuText: (name) =>
    [
      `Welcome back ${name} 👋`,
      "",
      "How can we help you today? / Aaj aapko kis cheez me madad chahiye?",
      "",
      "1️⃣ Services (सेवाएं)",
      "2️⃣ Products / Stones (प्रोडक्ट्स / रत्न)",
      "3️⃣ Talk to an Executive (एक्सपर्ट से बात)",
      "",
      "_Reply with 1, 2, or 3, or type your need_",
    ].join("\n"),
  servicesMenuText: [
    "Services Menu / सेवाएं:",
    "1️⃣ Kundli / Birth Chart (कुंडली)",
    "2️⃣ Vastu Consultation (वास्तु सलाह)",
    "3️⃣ Gemstone Recommendation (रत्न सलाह)",
    "4️⃣ Pooja / Paath Booking (पूजा/पाठ)",
    "5️⃣ Shaadi / Marriage Guidance (शादी/विवाह)",
    "6️⃣ Kaal Sarp Dosh / Sarpdosh Pooja (कालसर्प दोष पूजा)",
    "7️⃣ Talk to Executive",
    "8️⃣ Main Menu",
    "",
    "_Reply with a number or type the service name_",
  ].join("\n"),
  productsMenuText: [
    "Products Menu / प्रोडक्ट्स:",
    "1️⃣ Navaratna Set",
    "2️⃣ Ruby (Manik) / माणिक",
    "3️⃣ Emerald (Panna) / पन्ना",
    "4️⃣ Yellow Sapphire (Pukhraj) / पुखराज",
    "5️⃣ Blue Sapphire (Neelam) / नीलम",
    "6️⃣ Pearl (Moti) / मोती",
    "7️⃣ Diamond (Heera) / हीरा",
    "8️⃣ Coral (Moonga) / मूंगा",
    "9️⃣ Hessonite (Gomed) / गोमेद",
    "10️⃣ Cat's Eye (Lehsunia) / लहसुनिया",
    "11️⃣ Opal / ओपल",
    "12️⃣ Amethyst / जमुनिया",
    "13️⃣ Topaz / टोपाज़",
    "14️⃣ Turquoise / फिरोज़ा",
    "15️⃣ Moonstone / चंद्रकांत",
    "16️⃣ Other Stone / अन्य",
    "17️⃣ Main Menu",
    "",
    "_Reply with a number or type stone name_",
  ].join("\n"),
  productDetailsPrompt:
    "Great choice 👍\nPlease share product details (stone name, carat/size, ring/pendant, purpose).\nPrices vary by quality/weight; we will share the best current estimate after details.",
  serviceOptions: [
    {
      id: "kundli",
      number: "1",
      label: "Kundli / Birth Chart (कुंडली)",
      keywords: [
        "kundli",
        "kundali",
        "janam",
        "patrika",
        "birth chart",
        "horoscope",
        "कुंडली",
      ],
      prompt:
        "Kundli ke liye apni *DOB (DD/MM/YYYY)*, *birth time*, aur *birth place (city)* bhejiye.\nअगर कोई specific समस्या है तो वो भी लिखें.",
    },
    {
      id: "vastu",
      number: "2",
      label: "Vastu Consultation (वास्तु सलाह)",
      keywords: ["vastu", "vaastu", "वास्तु"],
      prompt:
        "Vastu ke liye property type (home/office), city, aur concern/issue share karein.",
    },
    {
      id: "gemstone",
      number: "3",
      label: "Gemstone Recommendation (रत्न सलाह)",
      keywords: [
        "gemstone",
        "stone",
        "ratna",
        "pukhraj",
        "neelam",
        "panna",
        "manik",
        "moti",
        "heera",
        "gomed",
        "lehsunia",
        "moonga",
        "ruby",
        "emerald",
        "sapphire",
        "pearl",
        "diamond",
        "रत्न",
      ],
      prompt:
        "Gemstone recommendation ke liye apni *DOB*, *birth time*, *birth place*, aur concern (career/health/marriage) bhejiye.",
    },
    {
      id: "pooja",
      number: "4",
      label: "Pooja / Paath Booking (पूजा/पाठ)",
      keywords: ["pooja", "puja", "paath", "path", "havan", "yagya", "पूजा", "पाठ"],
      prompt:
        "Pooja/Paath booking ke liye pooja type, preferred date, aur city/location share karein.",
    },
    {
      id: "shaadi",
      number: "5",
      label: "Shaadi / Marriage Guidance (शादी/विवाह)",
      keywords: ["shaadi", "shadi", "marriage", "vivah", "muhurat", "शादी", "विवाह"],
      prompt:
        "Shaadi guidance ke liye bride & groom ki *DOB*, *birth time*, *birth place* aur requirement (matching/muhurat) bhejiye.",
    },
    {
      id: "kaalsarp",
      number: "6",
      label: "Kaal Sarp Dosh / Sarpdosh Pooja (कालसर्प दोष पूजा)",
      keywords: [
        "kaal sarp",
        "kalsarp",
        "kal sarp",
        "sarpdosh",
        "sarpa dosh",
        "nag dosh",
        "कालसर्प",
        "सर्पदोष",
      ],
      prompt:
        "Kaal Sarp Dosh Pooja ke liye apni *DOB*, *birth time*, *birth place*, preferred date, aur city share karein.",
    },
    {
      id: "executive",
      number: "7",
      label: "Talk to Executive",
      keywords: ["executive", "agent", "human", "call", "talk", "baat", "help"],
    },
    {
      id: "main_menu",
      number: "8",
      label: "Main Menu",
      keywords: ["menu", "main menu", "back", "home", "मुख्य मेनू", "मेनू"],
    },
  ],
  productOptions: [
    { id: "navaratna", number: "1", label: "Navaratna Set", keywords: ["navaratna", "navratan"] },
    { id: "ruby", number: "2", label: "Ruby (Manik)", keywords: ["ruby", "manik", "माणिक"] },
    { id: "emerald", number: "3", label: "Emerald (Panna)", keywords: ["emerald", "panna", "पन्ना"] },
    { id: "yellow_sapphire", number: "4", label: "Yellow Sapphire (Pukhraj)", keywords: ["yellow sapphire", "pukhraj", "पुखराज"] },
    { id: "blue_sapphire", number: "5", label: "Blue Sapphire (Neelam)", keywords: ["blue sapphire", "neelam", "नीलम"] },
    { id: "pearl", number: "6", label: "Pearl (Moti)", keywords: ["pearl", "moti", "मोती"] },
    { id: "diamond", number: "7", label: "Diamond (Heera)", keywords: ["diamond", "heera", "हीरा"] },
    { id: "coral", number: "8", label: "Coral (Moonga)", keywords: ["coral", "moonga", "मूंगा"] },
    { id: "hessonite", number: "9", label: "Hessonite (Gomed)", keywords: ["hessonite", "gomed", "गोमेद"] },
    { id: "catseye", number: "10", label: "Cat's Eye (Lehsunia)", keywords: ["cat's eye", "cats eye", "lehsunia", "लहसुनिया"] },
    { id: "opal", number: "11", label: "Opal", keywords: ["opal", "ओपल"] },
    { id: "amethyst", number: "12", label: "Amethyst", keywords: ["amethyst", "jamuniya", "जमुनिया"] },
    { id: "topaz", number: "13", label: "Topaz", keywords: ["topaz", "टोपाज़"] },
    { id: "turquoise", number: "14", label: "Turquoise", keywords: ["turquoise", "firoza", "फिरोज़ा"] },
    { id: "moonstone", number: "15", label: "Moonstone", keywords: ["moonstone", "chandrakant", "चंद्रकांत"] },
    { id: "other", number: "16", label: "Other Stone / Custom", keywords: ["other stone", "custom", "koi aur", "any other"] },
    { id: "main_menu", number: "17", label: "Main Menu", keywords: ["menu", "main menu", "back", "home", "मुख्य मेनू", "मेनू"] },
  ],
  detectMainIntent: buildDetectMainIntent({
    serviceKeywords: [
      "service",
      "seva",
      "kundli",
      "kundali",
      "vastu",
      "pooja",
      "puja",
      "paath",
      "path",
      "gemstone recommendation",
      "recommendation",
      "consult",
      "consultation",
      "shaadi",
      "marriage",
      "vivah",
      "muhurat",
      "kaal sarp",
      "sarpdosh",
      "astro",
      "astrology",
    ],
    productKeywords: [
      "product",
      "stone",
      "gemstone",
      "ring",
      "pendant",
      "mala",
      "ratna",
      "buy",
      "order",
      "price",
      "cost",
      "pearl",
      "diamond",
      "ruby",
      "emerald",
      "sapphire",
      "neelam",
      "panna",
      "manik",
      "moti",
      "heera",
      "pukhraj",
      "gomed",
      "lehsunia",
      "moonga",
    ],
  }),
};

const CLINIC_PROFILE = {
  id: "clinic",
  brandName: "Your Clinic",
  serviceLabel: "Appointments & Consultations",
  productLabel: "Reports / Pharmacy",
  execLabel: "Talk to Executive",
  supportsAppointments: true,
  appointmentKeywords: ["appointment", "doctor", "clinic", "consultation", "book", "schedule"],
  mainMenuText: buildMainMenuText({
    brandName: "Your Clinic",
    serviceLabel: "Appointments & Consultations",
    productLabel: "Reports / Pharmacy",
    execLabel: "Talk to Executive",
  }),
  returningMenuText: (name) =>
    buildReturningMenuText(
      {
        serviceLabel: "Appointments & Consultations",
        productLabel: "Reports / Pharmacy",
        execLabel: "Talk to Executive",
      },
      name
    ),
  servicesMenuText: [
    "Clinic Services:",
    "1️⃣ Doctor Appointment",
    "2️⃣ Online Consultation",
    "3️⃣ Lab Test Booking",
    "4️⃣ Follow-up / Prescription",
    "5️⃣ Talk to Executive",
    "6️⃣ Main Menu",
    "",
    "_Reply with a number or type the service name_",
  ].join("\n"),
  productsMenuText: [
    "Reports & Pharmacy:",
    "1️⃣ Medicine / Pharmacy Order",
    "2️⃣ Health Package",
    "3️⃣ Report Copy",
    "4️⃣ Main Menu",
    "",
    "_Reply with a number or type your need_",
  ].join("\n"),
  productDetailsPrompt:
    "Please share medicine/package/report name, quantity, and prescription (if any).",
  serviceOptions: [
    {
      id: "appointment",
      number: "1",
      label: "Doctor Appointment",
      keywords: ["appointment", "doctor", "clinic", "checkup", "booking"],
      bookable: true,
      prompt:
        "Please share patient name, preferred date/time, doctor (if any), and concern.",
    },
    {
      id: "consultation",
      number: "2",
      label: "Online Consultation",
      keywords: ["consultation", "online", "video", "call"],
      bookable: true,
      prompt:
        "Please share patient name, preferred date/time, and concern for consultation.",
    },
    {
      id: "lab",
      number: "3",
      label: "Lab Test Booking",
      keywords: ["lab", "test", "blood", "report"],
      bookable: true,
      prompt:
        "Please share test name(s), preferred date/time, and patient age.",
    },
    {
      id: "followup",
      number: "4",
      label: "Follow-up / Prescription",
      keywords: ["follow up", "followup", "prescription", "review"],
      prompt:
        "Please share patient name and previous visit details or prescription reference.",
    },
    {
      id: "executive",
      number: "5",
      label: "Talk to Executive",
      keywords: ["executive", "agent", "human", "call", "talk", "help"],
    },
    {
      id: "main_menu",
      number: "6",
      label: "Main Menu",
      keywords: ["menu", "main menu", "back", "home"],
    },
  ],
  productOptions: [
    {
      id: "medicine",
      number: "1",
      label: "Medicine / Pharmacy Order",
      keywords: ["medicine", "pharmacy", "tablet", "capsule", "drug"],
    },
    {
      id: "package",
      number: "2",
      label: "Health Package",
      keywords: ["package", "health package", "checkup"],
    },
    {
      id: "report_copy",
      number: "3",
      label: "Report Copy",
      keywords: ["report copy", "report", "results"],
    },
    {
      id: "main_menu",
      number: "4",
      label: "Main Menu",
      keywords: ["menu", "main menu", "back", "home"],
    },
  ],
  detectMainIntent: buildDetectMainIntent({
    serviceKeywords: ["appointment", "doctor", "clinic", "consultation", "checkup", "lab", "test"],
    productKeywords: ["medicine", "pharmacy", "report", "package", "prescription"],
  }),
};

const RESTAURANT_PROFILE = {
  id: "restaurant",
  brandName: "Your Restaurant",
  serviceLabel: "Reservations & Events",
  productLabel: "Order Food",
  execLabel: "Talk to Executive",
  supportsAppointments: true,
  appointmentKeywords: ["reservation", "table", "booking", "event", "catering"],
  mainMenuText: buildMainMenuText({
    brandName: "Your Restaurant",
    serviceLabel: "Reservations & Events",
    productLabel: "Order Food",
    execLabel: "Talk to Executive",
  }),
  returningMenuText: (name) =>
    buildReturningMenuText(
      {
        serviceLabel: "Reservations & Events",
        productLabel: "Order Food",
        execLabel: "Talk to Executive",
      },
      name
    ),
  servicesMenuText: [
    "Reservations & Events:",
    "1️⃣ Table Reservation",
    "2️⃣ Catering / Party Order",
    "3️⃣ Event Booking",
    "4️⃣ Talk to Executive",
    "5️⃣ Main Menu",
    "",
    "_Reply with a number or type the service name_",
  ].join("\n"),
  productsMenuText: [
    "Food Orders:",
    "1️⃣ Today's Menu",
    "2️⃣ Place an Order",
    "3️⃣ Special Request",
    "4️⃣ Main Menu",
    "",
    "_Reply with a number or type your need_",
  ].join("\n"),
  productDetailsPrompt:
    "Please share items, quantity, delivery address, and preferred time.",
  serviceOptions: [
    {
      id: "reservation",
      number: "1",
      label: "Table Reservation",
      keywords: ["table", "reservation", "booking"],
      bookable: true,
      prompt:
        "Please share name, number of guests, preferred date/time, and contact number.",
    },
    {
      id: "catering",
      number: "2",
      label: "Catering / Party Order",
      keywords: ["catering", "party", "bulk", "event"],
      bookable: true,
      prompt:
        "Please share event date, number of guests, menu preference, and location.",
    },
    {
      id: "event",
      number: "3",
      label: "Event Booking",
      keywords: ["event", "booking", "private"],
      bookable: true,
      prompt:
        "Please share event date, guests count, and any special requirements.",
    },
    {
      id: "executive",
      number: "4",
      label: "Talk to Executive",
      keywords: ["executive", "agent", "human", "call", "talk", "help"],
    },
    {
      id: "main_menu",
      number: "5",
      label: "Main Menu",
      keywords: ["menu", "main menu", "back", "home"],
    },
  ],
  productOptions: [
    {
      id: "menu",
      number: "1",
      label: "Today's Menu",
      keywords: ["menu", "today", "specials"],
    },
    {
      id: "order",
      number: "2",
      label: "Place an Order",
      keywords: ["order", "food", "delivery", "takeaway"],
    },
    {
      id: "special",
      number: "3",
      label: "Special Request",
      keywords: ["special", "custom", "extra"],
    },
    {
      id: "main_menu",
      number: "4",
      label: "Main Menu",
      keywords: ["menu", "main menu", "back", "home"],
    },
  ],
  detectMainIntent: buildDetectMainIntent({
    serviceKeywords: ["reservation", "table", "booking", "party", "catering", "event"],
    productKeywords: ["order", "food", "menu", "delivery", "takeaway"],
  }),
};

const SALON_PROFILE = {
  id: "salon",
  brandName: "Your Salon",
  serviceLabel: "Appointments",
  productLabel: "Packages & Products",
  execLabel: "Talk to Executive",
  supportsAppointments: true,
  appointmentKeywords: ["appointment", "salon", "haircut", "facial", "booking"],
  mainMenuText: buildMainMenuText({
    brandName: "Your Salon",
    serviceLabel: "Appointments",
    productLabel: "Packages & Products",
    execLabel: "Talk to Executive",
  }),
  returningMenuText: (name) =>
    buildReturningMenuText(
      {
        serviceLabel: "Appointments",
        productLabel: "Packages & Products",
        execLabel: "Talk to Executive",
      },
      name
    ),
  servicesMenuText: [
    "Salon Services:",
    "1️⃣ Haircut / Styling",
    "2️⃣ Hair Color",
    "3️⃣ Facial / Skin Care",
    "4️⃣ Bridal / Party Makeup",
    "5️⃣ Talk to Executive",
    "6️⃣ Main Menu",
    "",
    "_Reply with a number or type the service name_",
  ].join("\n"),
  productsMenuText: [
    "Packages & Products:",
    "1️⃣ Service Package",
    "2️⃣ Product Purchase",
    "3️⃣ Gift Card",
    "4️⃣ Main Menu",
    "",
    "_Reply with a number or type your need_",
  ].join("\n"),
  productDetailsPrompt:
    "Please share package/product name and preferred date/time.",
  serviceOptions: [
    {
      id: "haircut",
      number: "1",
      label: "Haircut / Styling",
      keywords: ["haircut", "cut", "styling"],
      bookable: true,
      prompt:
        "Please share preferred date/time and any styling preference.",
    },
    {
      id: "color",
      number: "2",
      label: "Hair Color",
      keywords: ["color", "colour", "highlights", "balayage"],
      bookable: true,
      prompt:
        "Please share preferred date/time and color preference.",
    },
    {
      id: "facial",
      number: "3",
      label: "Facial / Skin Care",
      keywords: ["facial", "skin", "cleanup", "spa"],
      bookable: true,
      prompt:
        "Please share preferred date/time and skin concern (if any).",
    },
    {
      id: "bridal",
      number: "4",
      label: "Bridal / Party Makeup",
      keywords: ["bridal", "party", "makeup", "make-up"],
      bookable: true,
      prompt:
        "Please share event date/time and makeup requirement.",
    },
    {
      id: "executive",
      number: "5",
      label: "Talk to Executive",
      keywords: ["executive", "agent", "human", "call", "talk", "help"],
    },
    {
      id: "main_menu",
      number: "6",
      label: "Main Menu",
      keywords: ["menu", "main menu", "back", "home"],
    },
  ],
  productOptions: [
    {
      id: "package",
      number: "1",
      label: "Service Package",
      keywords: ["package", "combo", "deal"],
    },
    {
      id: "product",
      number: "2",
      label: "Product Purchase",
      keywords: ["product", "kit", "shampoo", "serum"],
    },
    {
      id: "gift",
      number: "3",
      label: "Gift Card",
      keywords: ["gift", "voucher", "card"],
    },
    {
      id: "main_menu",
      number: "4",
      label: "Main Menu",
      keywords: ["menu", "main menu", "back", "home"],
    },
  ],
  detectMainIntent: buildDetectMainIntent({
    serviceKeywords: ["appointment", "haircut", "color", "facial", "makeup", "salon"],
    productKeywords: ["package", "product", "gift", "voucher", "kit"],
  }),
};

const SHOP_PROFILE = {
  id: "shop",
  brandName: "Your Shop",
  serviceLabel: "Availability & Store Visit",
  productLabel: "Product Inquiry / Order",
  execLabel: "Talk to Executive",
  mainMenuText: buildMainMenuText({
    brandName: "Your Shop",
    serviceLabel: "Availability & Store Visit",
    productLabel: "Product Inquiry / Order",
    execLabel: "Talk to Executive",
  }),
  returningMenuText: (name) =>
    buildReturningMenuText(
      {
        serviceLabel: "Availability & Store Visit",
        productLabel: "Product Inquiry / Order",
        execLabel: "Talk to Executive",
      },
      name
    ),
  servicesMenuText: [
    "Store Services:",
    "1️⃣ Check Availability",
    "2️⃣ Store Visit / Appointment",
    "3️⃣ Return / Exchange",
    "4️⃣ Bulk Order",
    "5️⃣ Talk to Executive",
    "6️⃣ Main Menu",
    "",
    "_Reply with a number or type the service name_",
  ].join("\n"),
  productsMenuText: [
    "Product Inquiry:",
    "1️⃣ Price Inquiry",
    "2️⃣ Place an Order",
    "3️⃣ Catalog / Options",
    "4️⃣ Main Menu",
    "",
    "_Reply with a number or type your need_",
  ].join("\n"),
  productDetailsPrompt:
    "Please share product name, size/color, quantity, and delivery details (if needed).",
  serviceOptions: [
    {
      id: "availability",
      number: "1",
      label: "Check Availability",
      keywords: ["availability", "in stock", "stock"],
      prompt:
        "Please share the product name, size/color, and quantity to check availability.",
    },
    {
      id: "visit",
      number: "2",
      label: "Store Visit / Appointment",
      keywords: ["visit", "appointment", "store"],
      prompt:
        "Please share preferred date/time for your visit.",
    },
    {
      id: "return",
      number: "3",
      label: "Return / Exchange",
      keywords: ["return", "exchange", "refund"],
      prompt:
        "Please share order details and reason for return/exchange.",
    },
    {
      id: "bulk",
      number: "4",
      label: "Bulk Order",
      keywords: ["bulk", "wholesale", "large order"],
      prompt:
        "Please share product name, quantity, and delivery location.",
    },
    {
      id: "executive",
      number: "5",
      label: "Talk to Executive",
      keywords: ["executive", "agent", "human", "call", "talk", "help"],
    },
    {
      id: "main_menu",
      number: "6",
      label: "Main Menu",
      keywords: ["menu", "main menu", "back", "home"],
    },
  ],
  productOptions: [
    {
      id: "price",
      number: "1",
      label: "Price Inquiry",
      keywords: ["price", "cost", "rate"],
    },
    {
      id: "order",
      number: "2",
      label: "Place an Order",
      keywords: ["order", "buy", "purchase"],
    },
    {
      id: "catalog",
      number: "3",
      label: "Catalog / Options",
      keywords: ["catalog", "options", "collection"],
    },
    {
      id: "main_menu",
      number: "4",
      label: "Main Menu",
      keywords: ["menu", "main menu", "back", "home"],
    },
  ],
  detectMainIntent: buildDetectMainIntent({
    serviceKeywords: ["availability", "visit", "return", "exchange", "bulk", "wholesale"],
    productKeywords: ["price", "order", "buy", "catalog", "product"],
  }),
};

const AUTOMATION_PROFILES = {
  astrology: ASTROLOGY_PROFILE,
  clinic: CLINIC_PROFILE,
  restaurant: RESTAURANT_PROFILE,
  salon: SALON_PROFILE,
  shop: SHOP_PROFILE,
};

const getAutomationProfile = (profession) =>
  AUTOMATION_PROFILES[profession] || AUTOMATION_PROFILES[DEFAULT_PROFESSION];

const parseAllowedAutomationProfessions = () => {
  const raw = String(process.env.WHATSAPP_AUTOMATION_PROFESSIONS || "").trim();
  if (!raw) {
    return new Set(Object.keys(AUTOMATION_PROFILES));
  }
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => Boolean(AUTOMATION_PROFILES[entry]))
  );
};

const ALLOWED_AUTOMATION_PROFESSIONS = parseAllowedAutomationProfessions();

const textHasAny = (input, keywords) => keywords.some((word) => input.includes(word));

const extractNumber = (input) => {
  const match = input.match(/\d+/);
  return match ? match[0] : null;
};

const matchOption = (input, options) => {
  const number = extractNumber(input);
  if (number) {
    const numericMatch = options.find((option) => option.number === number);
    if (numericMatch) return numericMatch;
  }
  return options.find((option) => option.keywords?.some((keyword) => input.includes(keyword)));
};

const isMenuCommand = (input, rawText) => {
  if (["menu", "main menu", "start", "restart", "home", "back"].includes(input)) return true;
  return rawText.includes("मेनू") || rawText.includes("मुख्य मेनू");
};

const buildRequirementSummary = ({ user, phone }) => {
  const lines = [];
  const displayName = sanitizeNameUpper(user.name || user.data.name) || "N/A";
  const email = sanitizeEmail(user.email || user.data.email) || "N/A";
  const normalizedPhone = sanitizePhone(phone) || "N/A";
  const altContact = sanitizePhone(user.data.altContact) || "N/A";

  lines.push(`Name: ${displayName}`);
  lines.push(`Phone: ${normalizedPhone}`);
  lines.push(`Email: ${email}`);

  if (user.data.reason) lines.push(`Request Type: ${sanitizeText(user.data.reason, 120)}`);
  if (user.data.serviceType) lines.push(`Service: ${sanitizeText(user.data.serviceType, 200)}`);
  if (user.data.productType) lines.push(`Product: ${sanitizeText(user.data.productType, 200)}`);
  if (user.data.serviceDetails) {
    lines.push(`Service Details: ${sanitizeText(user.data.serviceDetails, 800)}`);
  }
  if (user.data.productDetails) {
    lines.push(`Product Details: ${sanitizeText(user.data.productDetails, 800)}`);
  }
  if (user.data.address) lines.push(`Address: ${sanitizeText(user.data.address, 500)}`);
  if (user.data.altContact) lines.push(`Alt Contact: ${altContact}`);
  if (user.data.executiveMessage) {
    lines.push(`Message: ${sanitizeText(user.data.executiveMessage, 800)}`);
  }
  if (user.data.appointmentType) {
    lines.push(`Appointment Type: ${sanitizeText(user.data.appointmentType, 150)}`);
  }
  if (user.data.appointmentAt) {
    lines.push(`Appointment At: ${sanitizeText(user.data.appointmentAt, 150)}`);
  }
  if (user.data.lastUserMessage) {
    lines.push(`Last User Message: ${sanitizeText(user.data.lastUserMessage, 800)}`);
  }

  return lines.join("\n");
};

const DATE_PATTERNS = [
  "d MMM",
  "d MMMM",
  "d MMM yyyy",
  "d MMMM yyyy",
  "d/M/yyyy",
  "d-M-yyyy",
  "d/M",
  "d-M",
  "M/d/yyyy",
  "M-d-yyyy",
  "M/d",
  "M-d",
  "yyyy-MM-dd",
];

const DATE_TIME_PATTERNS = [
  "d MMM h a",
  "d MMMM h a",
  "d MMM yyyy h a",
  "d MMMM yyyy h a",
  "d MMM h:mm a",
  "d MMMM h:mm a",
  "d/M/yyyy H:mm",
  "d-M-yyyy H:mm",
  "d/M H:mm",
  "d-M H:mm",
  "yyyy-MM-dd H:mm",
  "yyyy-MM-dd h a",
  "d/M/yyyy h a",
  "d-M-yyyy h a",
  "d/M h a",
  "d-M h a",
  "d/M/yyyy h:mm a",
  "d-M-yyyy h:mm a",
  "d/M h:mm a",
  "d-M h:mm a",
  "M/d/yyyy H:mm",
  "M-d-yyyy H:mm",
  "M/d H:mm",
  "M-d H:mm",
  "M/d/yyyy h a",
  "M-d-yyyy h a",
  "M/d h a",
  "M-d h a",
  "M/d/yyyy h:mm a",
  "M-d-yyyy h:mm a",
  "M/d h:mm a",
  "M-d h:mm a",
];

const parseWithPatterns = (text, patterns, baseDate) => {
  for (const pattern of patterns) {
    const parsed = parse(text, pattern, baseDate);
    if (isValid(parsed)) {
      return parsed;
    }
  }
  return null;
};

const parseDateFromText = (text) => {
  const lower = text.toLowerCase();
  const today = startOfDay(new Date());
  if (lower.includes("today")) return today;
  if (lower.includes("tomorrow")) return addDays(today, 1);
  if (lower.includes("day after tomorrow")) return addDays(today, 2);
  const parsed = parseWithPatterns(text, DATE_PATTERNS, new Date());
  return parsed ? startOfDay(parsed) : null;
};

const parseTimeFromText = (text) => {
  const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
};

const parseDateTimeFromText = (text) => {
  const parsed = parseWithPatterns(text, DATE_TIME_PATTERNS, new Date());
  if (parsed && isValid(parsed)) return parsed;
  const date = parseDateFromText(text);
  const time = parseTimeFromText(text);
  if (date && time) {
    return setMinutes(setHours(date, time.hour), time.minute);
  }
  return null;
};

const isPastDate = (date) => {
  if (!date || !isValid(date)) return false;
  return isBefore(date, startOfDay(new Date()));
};

const isPastDateTime = (dateTime) => {
  if (!dateTime || !isValid(dateTime)) return false;
  return isBefore(dateTime, new Date());
};

const withinAppointmentWindow = (date) => {
  if (!date || !isValid(date)) return false;
  const now = new Date();
  const windowEnd = addMonths(startOfDay(now), APPOINTMENT_WINDOW_MONTHS);
  return !isBefore(date, now) && !isAfter(date, windowEnd);
};

const buildDateOptions = () => {
  const base = startOfDay(new Date());
  return [1, 2, 3].map((offset) => addDays(base, offset));
};

const formatDateOption = (date) => format(date, "EEE, dd MMM");
const formatTimeOption = (date) => format(date, "h:mm a");

const buildDaySlots = (date) => {
  const slots = [];
  for (let hour = APPOINTMENT_START_HOUR; hour < APPOINTMENT_END_HOUR; hour += 1) {
    slots.push(setMinutes(setHours(date, hour), 0));
  }
  return slots;
};

const getBookedSlots = async (adminId, dayStart, dayEnd) => {
  const [rows] = await db.query(
    `SELECT start_time
     FROM appointments
     WHERE admin_id = ? AND status != 'cancelled' AND start_time >= ? AND start_time < ?`,
    [adminId, dayStart.toISOString(), dayEnd.toISOString()]
  );
  return new Set(rows.map((row) => new Date(row.start_time).getTime()));
};

const getAvailableSlotsForDate = async (adminId, date) => {
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  const booked = await getBookedSlots(adminId, dayStart, dayEnd);
  return buildDaySlots(dayStart).filter((slot) => !booked.has(slot.getTime()));
};

const findNearestAvailableSlots = async (adminId, requestedAt) => {
  const dayStart = startOfDay(requestedAt);
  const available = await getAvailableSlotsForDate(adminId, dayStart);
  if (available.length) {
    return available
      .sort((a, b) => Math.abs(a - requestedAt) - Math.abs(b - requestedAt))
      .slice(0, 3);
  }
  const slots = [];
  for (let i = 1; i <= 7 && slots.length < 3; i += 1) {
    const date = addDays(dayStart, i);
    if (!withinAppointmentWindow(date)) break;
    const daySlots = await getAvailableSlotsForDate(adminId, date);
    slots.push(...daySlots);
  }
  return slots.slice(0, 3);
};

const sendAppointmentDateOptions = async ({ sendMessage, user }) => {
  const options = buildDateOptions();
  user.data.appointmentDateOptions = options.map((date) => date.toISOString());
  const lines = options.map((date, idx) => `${idx + 1}️⃣ ${formatDateOption(date)}`);
  await sendMessage(`Please choose a date:\n${lines.join("\n")}`);
};

const sendAppointmentTimeOptions = async ({ sendMessage, user, adminId, date }) => {
  const available = await getAvailableSlotsForDate(adminId, date);
  if (!available.length) {
    await sendMessage(
      "No slots available on that date. Please choose another date."
    );
    await sendAppointmentDateOptions({ sendMessage, user });
    user.step = "APPOINTMENT_DATE";
    return false;
  }
  user.data.appointmentTimeOptions = available.map((slot) => slot.toISOString());
  const lines = available.map((slot, idx) => `${idx + 1}️⃣ ${formatTimeOption(slot)}`);
  await sendMessage(`Available times:\n${lines.join("\n")}\nReply with a time or number.`);
  return true;
};

const bookAppointment = async ({
  adminId,
  user,
  from,
  phone,
  sendMessage,
  slot,
  appointmentType,
  client,
  users,
}) => {
  if (!withinAppointmentWindow(slot)) {
    await sendMessage(
      `We can only book appointments within ${APPOINTMENT_WINDOW_MONTHS} months. Please choose a nearer date.`
    );
    await sendAppointmentDateOptions({ sendMessage, user });
    user.step = "APPOINTMENT_DATE";
    return;
  }

  const hour = slot.getHours();
  if (hour < APPOINTMENT_START_HOUR || hour >= APPOINTMENT_END_HOUR) {
    await sendMessage(
      `Available slots are between ${APPOINTMENT_START_HOUR}:00 and ${APPOINTMENT_END_HOUR}:00.`
    );
    await sendAppointmentTimeOptions({ sendMessage, user, adminId, date: slot });
    user.step = "APPOINTMENT_TIME";
    return;
  }

  const startTime = slot.toISOString();
  const endTime = addMinutes(slot, APPOINTMENT_SLOT_MINUTES).toISOString();

  try {
    await db.query(
      `INSERT INTO appointments (user_id, admin_id, profession, appointment_type, start_time, end_time, status)
       VALUES (?, ?, ?, ?, ?, ?, 'booked')`,
      [
        user.clientId,
        adminId,
        user.data?.profession || null,
        appointmentType || "Appointment",
        startTime,
        endTime,
      ]
    );
  } catch (err) {
    if (err?.code === "23505") {
      const alternatives = await findNearestAvailableSlots(adminId, slot);
      if (alternatives.length) {
        const lines = alternatives.map((s, idx) => `${idx + 1}️⃣ ${formatDateOption(s)} ${formatTimeOption(s)}`);
        await sendMessage(
          `That slot is already booked. Here are the nearest available times:\n${lines.join("\n")}`
        );
        user.data.appointmentTimeOptions = alternatives.map((s) => s.toISOString());
        user.step = "APPOINTMENT_TIME";
      } else {
        await sendMessage("That slot is already booked. Please choose another date.");
        await sendAppointmentDateOptions({ sendMessage, user });
        user.step = "APPOINTMENT_DATE";
      }
      return;
    }
    throw err;
  }

  user.data.reason = "Appointment";
  user.data.appointmentType = appointmentType || "Appointment";
  user.data.appointmentAt = `${formatDateOption(slot)} ${formatTimeOption(slot)}`;

  await sendMessage(
    `✅ Appointment booked for ${formatDateOption(slot)} at ${formatTimeOption(slot)}.`
  );

  await maybeFinalizeLead({
    user,
    from,
    phone,
    assignedAdminId: adminId,
    client,
    users,
    sendMessage,
  });
};

const startAppointmentFlow = async ({ user, sendMessage, appointmentType }) => {
  user.data.appointmentType = appointmentType || "Appointment";
  user.data.appointmentDate = null;
  user.data.appointmentDateOptions = [];
  user.data.appointmentTimeOptions = [];
  user.step = "APPOINTMENT_DATE";
  await sendAppointmentDateOptions({ sendMessage, user });
};

const logMessage = async ({ userId, adminId, text, type }) => {
  const sanitizedText = sanitizeText(text, 4000);
  if (!userId || !adminId || !sanitizedText) return null;
  const [rows] = await db.query(
    `INSERT INTO messages (user_id, admin_id, message_text, message_type, status)
     VALUES (?, ?, ?, ?, 'delivered')
     RETURNING id, created_at`,
    [userId, adminId, sanitizedText, type]
  );
  return rows?.[0] || null;
};

const logIncomingMessage = async ({ userId, adminId, text }) =>
  logMessage({ userId, adminId, text, type: "incoming" });

const sendAndLog = async ({ client, from, userId, adminId, text }) => {
  await client.sendMessage(from, text);
  return logMessage({ userId, adminId, text, type: "outgoing" });
};

export const sendAdminMessage = async ({ adminId, userId, text }) => {
  if (!Number.isFinite(adminId)) {
    return { error: "adminId required", code: "admin_required", status: 400 };
  }
  if (!Number.isFinite(userId)) {
    return { error: "userId required", code: "user_required", status: 400 };
  }
  const messageText = String(text || "").trim();
  if (!messageText) {
    return { error: "Message is required", code: "message_required", status: 400 };
  }
  const session = sessions.get(adminId);
  if (!session || !session.state?.isReady || !session.client) {
    return { error: "WhatsApp is not connected", code: "whatsapp_not_ready", status: 409 };
  }
  touchSession(session);

  const [rows] = await db.query(
    "SELECT id, phone FROM contacts WHERE id = ? LIMIT 1",
    [userId]
  );
  const user = rows?.[0];
  if (!user?.phone) {
    return { error: "Contact phone not found", code: "phone_missing", status: 404 };
  }
  const normalized = String(user.phone || "").replace(/[^\d]/g, "");
  if (!normalized) {
    return { error: "Contact phone is invalid", code: "phone_invalid", status: 400 };
  }

  const to = `${normalized}@c.us`;
  let logEntry = null;
  try {
    logEntry = await sendAndLog({
      client: session.client,
      from: to,
      userId,
      adminId,
      text: messageText,
    });
  } catch (err) {
    return {
      error: err?.message || "Failed to send message",
      code: "send_failed",
      status: 500,
    };
  }

  return {
    success: true,
    data: {
      id: logEntry?.id || null,
      created_at: logEntry?.created_at || new Date().toISOString(),
      status: "delivered",
    },
  };
};

const promptForName = async ({ user, sendMessage }) => {
  await delay(1000);
  await sendMessage("May I know your *name*?");
  user.step = "ASK_NAME";
};

const promptForEmail = async ({ user, sendMessage }) => {
  await delay(1000);
  await sendMessage("Could you please share your *email address*?");
  user.step = "ASK_EMAIL";
};

const maybeFinalizeLead = async ({
  user,
  from,
  phone,
  assignedAdminId,
  client,
  users,
  sendMessage,
}) => {
  const hasName = Boolean(sanitizeNameUpper(user.name || user.data.name));
  const normalizedEmail = sanitizeEmail(user.email || user.data.email);
  const hasEmail = Boolean(normalizedEmail);
  const emailHandled = hasEmail || user.data.emailChecked === true;

  if (!hasName) {
    user.data.pendingFinalize = true;
    await promptForName({ user, sendMessage });
    return;
  }

  if (!emailHandled) {
    user.data.pendingFinalize = true;
    await promptForEmail({ user, sendMessage });
    return;
  }

  user.name = sanitizeNameUpper(user.name || user.data.name);
  user.data.name = user.name;
  user.email = normalizedEmail;
  user.data.email = normalizedEmail;

  user.data.message = buildRequirementSummary({ user, phone });
  await finalizeLead({ user, from, phone, assignedAdminId, client, users, sendMessage });
};

const savePartialLead = async ({ user, phone, assignedAdminId }) => {
  const adminId = user.assignedAdminId || assignedAdminId;
  if (!user.clientId) return;

  const summary = sanitizeText(buildRequirementSummary({ user, phone }), 4000);
  const category = sanitizeText(
    user.data.reason ? `Partial - ${user.data.reason}` : "Partial",
    120
  );

  await db.query(
    `INSERT INTO leads (user_id, requirement_text, category, status)
     VALUES (?, ?, ?, 'pending')`,
    [user.clientId, summary, category]
  );
};

const scheduleIdleSave = ({ user, phone, assignedAdminId }) => {
  if (user.idleTimer) {
    clearTimeout(user.idleTimer);
  }

  const scheduledAt = user.lastUserMessageAt;
  user.idleTimer = setTimeout(() => {
    const now = Date.now();
    if (user.finalized) return;
    if (user.lastUserMessageAt !== scheduledAt) return;

    user.partialSavedAt = now;
    user.data.message = buildRequirementSummary({ user, phone });
    savePartialLead({ user, phone, assignedAdminId }).catch((err) => {
      console.error("❌ Failed to save partial lead:", err.message);
    });
  }, TWO_MINUTES_MS);
};

const sendResumePrompt = async ({ user, sendMessage, automation }) => {
  switch (user.step) {
    case "SERVICES_MENU":
      await sendMessage(automation.servicesMenuText);
      return;
    case "PRODUCTS_MENU":
      await sendMessage(automation.productsMenuText);
      return;
    case "SERVICE_DETAILS": {
      const serviceOption = automation.serviceOptions.find(
        (option) => option.label === user.data.serviceType
      );
      await sendMessage(
        serviceOption?.prompt ||
          "Please share your service details (DOB, time, place, and concern)."
      );
      return;
    }
    case "PRODUCT_REQUIREMENTS":
      await sendMessage(
        user.data.productDetailsPrompt || automation.productDetailsPrompt
      );
      return;
    case "PRODUCT_ADDRESS":
      await sendMessage(
        "Please share your *full delivery address with pin code* (पूरा पता + पिन कोड)."
      );
      return;
    case "PRODUCT_ALT_CONTACT":
      await sendMessage(
        "Alternate contact number (optional). If none, reply *NA*."
      );
      return;
    case "EXECUTIVE_MESSAGE":
      await sendMessage(
        "Sure 👍\nPlease tell us briefly *how we can help you today*."
      );
      return;
    case "APPOINTMENT_DATE":
      await sendAppointmentDateOptions({ sendMessage, user });
      return;
    case "APPOINTMENT_TIME": {
      const rawDate = user.data.appointmentDate;
      const date = rawDate ? new Date(rawDate) : null;
      if (date && isValid(date)) {
        await sendAppointmentTimeOptions({ sendMessage, user, adminId: user.assignedAdminId, date });
      } else {
        await sendAppointmentDateOptions({ sendMessage, user });
      }
      return;
    }
    case "ASK_NAME":
      await sendMessage("May I know your *name*?");
      return;
    case "ASK_EMAIL":
      await sendMessage("Could you please share your *email address*?");
      return;
    case "MENU":
      await sendMessage(
        user.isReturningUser && user.name
          ? automation.returningMenuText(user.name)
          : automation.mainMenuText
      );
      return;
    default:
      await sendMessage(automation.mainMenuText);
  }
};

const normalizeOutgoingText = (value) => String(value || "").toLowerCase().trim();

const inferStepFromOutgoing = (text, automation) => {
  if (!text) return null;
  const normalized = normalizeOutgoingText(text);

  if (normalized.includes("continue") && normalized.includes("start again")) {
    return "RESUME_DECISION";
  }
  if (automation?.servicesMenuText && text.trim() === automation.servicesMenuText.trim()) {
    return "SERVICES_MENU";
  }
  if (automation?.productsMenuText && text.trim() === automation.productsMenuText.trim()) {
    return "PRODUCTS_MENU";
  }
  if (automation?.mainMenuText && text.trim() === automation.mainMenuText.trim()) {
    return "MENU";
  }
  if (normalized.includes("please share your service details")) return "SERVICE_DETAILS";
  if (normalized.includes("full delivery address")) return "PRODUCT_ADDRESS";
  if (normalized.includes("alternate contact number")) return "PRODUCT_ALT_CONTACT";
  if (normalized.includes("email address")) return "ASK_EMAIL";
  if (normalized.includes("may i know") && normalized.includes("name")) return "ASK_NAME";
  if (normalized.includes("please tell us briefly") || normalized.includes("how we can help")) {
    return "EXECUTIVE_MESSAGE";
  }
  if (normalized.includes("please share a date") || normalized.includes("choose a date")) {
    return "APPOINTMENT_DATE";
  }
  if (normalized.includes("available times") || normalized.includes("select a time")) {
    return "APPOINTMENT_TIME";
  }
  if (normalized.includes("please choose a service")) return "SERVICES_MENU";
  if (normalized.includes("please choose a product")) return "PRODUCTS_MENU";
  if (normalized.includes("please reply with 1, 2, or 3")) return "MENU";
  if (normalized.includes("how can i help you today")) return "MENU";
  return null;
};

const finalizeLead = async ({
  user,
  from,
  phone,
  assignedAdminId,
  client,
  users,
  sendMessage,
}) => {
  let clientId = user.clientId;
  const adminId = user.assignedAdminId || assignedAdminId;
  const normalizedPhone = sanitizePhone(phone);
  if (!normalizedPhone) {
    throw new Error("Invalid phone number for contact.");
  }
  const displayName = sanitizeNameUpper(user.name || user.data.name) || "UNKNOWN";
  const email = sanitizeEmail(user.email || user.data.email);

  if (!clientId) {
    const [rows] = await db.query(
      "INSERT INTO contacts (name, phone, email, assigned_admin_id) VALUES (?, ?, ?, ?) RETURNING id",
      [displayName, normalizedPhone, email, adminId]
    );
    clientId = rows[0]?.id || null;
  }
  if (clientId) {
    await db.query(
      "UPDATE contacts SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?",
      [displayName !== "UNKNOWN" ? displayName : null, email, clientId]
    );
  }

  const requirementText = sanitizeText(
    user.data.message || buildRequirementSummary({ user, phone: normalizedPhone }),
    4000
  );
  const requirementCategory = sanitizeText(
    user.data.serviceType || user.data.productType || user.data.reason || "General",
    120
  );

  await db.query(
    `INSERT INTO leads (user_id, requirement_text, category, status)
     VALUES (?, ?, ?, 'pending')`,
    [clientId, requirementText, requirementCategory]
  );

  console.log(
    user.isReturningUser
      ? `🔁 Message saved for returning user: ${displayName}`
      : "🆕 New lead saved"
  );

  await delay(1000);
  await sendMessage(`Thank you ${displayName} 😊\nOur team will contact you shortly.`);

  if (user.idleTimer) {
    clearTimeout(user.idleTimer);
  }
  user.finalized = true;
  if (users?.[from]) {
    delete users[from];
  }
};

const handleIncomingMessage = async ({
  session,
  message,
  from,
  text,
  skipLog = false,
  skipDuplicateCheck = false,
  lastOutgoingText = null,
}) => {
  try {
    if (!session.state.isReady) return;
    if (message && message.fromMe) return;
    if (!skipDuplicateCheck && message && isDuplicateMessage(message)) return;
    touchSession(session);

    const { client, users } = session;
    const sender = from || message?.from;
    if (!sender || sender.endsWith("@g.us")) return;

    const messageText = sanitizeText(text ?? message?.body ?? "", 4000);
    if (!messageText) return;

    const lower = messageText.toLowerCase();
    const phone = sanitizePhone(sender.replace("@c.us", ""));
    if (!phone) return;

    /* ===============================
       🔍 CHECK USER IN DB
       =============================== */
    const activeAdminId = session.adminId;
    if (!activeAdminId) {
      console.warn("⚠️ Incoming message ignored because no admin is connected.");
      return;
    }

    const [rows] = await db.query(
      `SELECT id, name, email, assigned_admin_id
       FROM contacts
       WHERE phone = ? OR regexp_replace(phone, '\\D', '', 'g') = ?
       LIMIT 1`,
      [phone, phone]
    );

    let isReturningUser = rows.length > 0;
    let existingUser = isReturningUser
      ? {
          ...rows[0],
          name: sanitizeNameUpper(rows[0]?.name),
          email: sanitizeEmail(rows[0]?.email),
        }
      : null;
    let assignedAdminId = existingUser?.assigned_admin_id || activeAdminId;
    if (existingUser && existingUser.assigned_admin_id !== activeAdminId) {
      assignedAdminId = activeAdminId;
      await db.query(
        "UPDATE contacts SET assigned_admin_id = ? WHERE id = ?",
        [activeAdminId, existingUser.id]
      );
    }

    if (!isReturningUser) {
      try {
        const [createdRows] = await db.query(
          "INSERT INTO contacts (phone, assigned_admin_id) VALUES (?, ?) RETURNING id",
          [phone, assignedAdminId]
        );
        existingUser = {
          id: createdRows[0]?.id || null,
          name: null,
          email: null,
          assigned_admin_id: assignedAdminId,
        };
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY" || err.code === "23505") {
          const [freshRows] = await db.query(
            `SELECT id, name, email, assigned_admin_id
             FROM contacts
             WHERE phone = ? OR regexp_replace(phone, '\\D', '', 'g') = ?
             LIMIT 1`,
            [phone, phone]
          );
          if (freshRows.length > 0) {
            existingUser = {
              ...freshRows[0],
              name: sanitizeNameUpper(freshRows[0]?.name),
              email: sanitizeEmail(freshRows[0]?.email),
            };
            isReturningUser = true;
          }
        } else {
          throw err;
        }
      }
    }

    /* ===============================
       INIT USER SESSION
       =============================== */
    if (!session.users[sender]) {
      session.users[sender] = {
        step: isReturningUser ? "MENU" : "START",
        data: {},
        isReturningUser,
        clientId: existingUser?.id || null,
        name: isReturningUser ? existingUser.name : null,
        email: isReturningUser ? existingUser.email : null,
        assignedAdminId,
        greetedThisSession: !isReturningUser,
        resumeStep: null,
        awaitingResumeDecision: false,
        lastUserMessageAt: null,
        partialSavedAt: null,
        finalized: false,
        idleTimer: null,
      };
    }

    const user = session.users[sender];
    const sendMessage = async (messageTextToSend) =>
      sendAndLog({
        client: session.client,
        from: sender,
        userId: user.clientId,
        adminId: assignedAdminId,
        text: messageTextToSend,
      });

    if (!skipLog) {
      await logIncomingMessage({
        userId: user.clientId,
        adminId: assignedAdminId,
        text: messageText,
      });
    }

    const aiSettings = await getAdminAISettings(assignedAdminId);
    const adminProfile = await getAdminAutomationProfile(assignedAdminId);
    const baseAutomation = getAutomationProfile(adminProfile?.profession);
    const catalog = await getAdminCatalogItems(assignedAdminId);
    const automation = buildCatalogAutomation({ baseAutomation, catalog });
    user.data.profession = adminProfile?.profession || DEFAULT_PROFESSION;

    const automationAllowed = ALLOWED_AUTOMATION_PROFESSIONS.has(
      adminProfile?.profession
    );

    if (aiSettings?.ai_enabled) {
      const aiReply = await fetchAIReply({
        aiPrompt: aiSettings.ai_prompt,
        aiBlocklist: aiSettings.ai_blocklist,
        userMessage: messageText,
      });
      if (aiReply) {
        await sendMessage(aiReply);
      } else {
        await sendMessage("Thanks for your message. Our team will get back to you shortly.");
      }
      return;
    }

    if (!automationAllowed) {
      return;
    }

    if (lastOutgoingText) {
      const inferredStep = inferStepFromOutgoing(lastOutgoingText, automation);
      if (inferredStep && (user.step === "MENU" || user.step === "START")) {
        user.step = inferredStep;
      }
    }

    const now = Date.now();
    const lastMessageAt = user.lastUserMessageAt;
    if (
      lastMessageAt &&
      now - lastMessageAt >= TWELVE_HOURS_MS &&
      !user.finalized &&
      user.step !== "RESUME_DECISION"
    ) {
      user.resumeStep = user.step;
      user.awaitingResumeDecision = true;
      user.step = "RESUME_DECISION";

      const nameLine = user.name ? `Nice to hear from you again, ${user.name} 😊\n` : "";
      await delay(500);
      await sendMessage(
        `${nameLine}Do you want to continue the last conversation or start again?\n1️⃣ Continue\n2️⃣ Start again`
      );
      if (user.name) {
        user.greetedThisSession = true;
      }
      user.lastUserMessageAt = now;
      user.data.lastUserMessage = messageText;
      user.partialSavedAt = null;
      scheduleIdleSave({ user, phone, assignedAdminId });
      return;
    }

    if (user.isReturningUser && user.name && !user.greetedThisSession) {
      await delay(500);
      await sendMessage(`Nice to hear from you, ${user.name} 😊`);
      user.greetedThisSession = true;
    }

    user.lastUserMessageAt = now;
    user.data.lastUserMessage = messageText;
    user.partialSavedAt = null;
    scheduleIdleSave({ user, phone, assignedAdminId });

    if (
      automation.supportsAppointments &&
      ["START", "MENU"].includes(user.step) &&
      textHasAny(lower, automation.appointmentKeywords || [])
    ) {
      await startAppointmentFlow({
        user,
        sendMessage,
        appointmentType: "Appointment",
      });
      return;
    }

    if (isMenuCommand(lower, messageText)) {
      await delay(1000);
      await sendMessage(
        user.isReturningUser && user.name
          ? automation.returningMenuText(user.name)
          : automation.mainMenuText
      );
      user.step = "MENU";
      return;
    }

    /* ===============================
       RESUME DECISION
       =============================== */
    if (user.step === "RESUME_DECISION") {
      const wantsContinue = ["1", "continue", "yes", "y", "haan", "han", "ha"].includes(lower);
      const wantsRestart = ["2", "start", "restart", "new", "no", "n", "nahi"].includes(lower);

      if (!wantsContinue && !wantsRestart) {
        await sendMessage("Please reply with 1 to continue or 2 to start again.");
        return;
      }

      if (wantsRestart) {
        user.data = {};
        user.resumeStep = null;
        user.awaitingResumeDecision = false;
        user.step = "START";
        await delay(1000);
        await sendMessage(automation.mainMenuText);
        user.step = "MENU";
        return;
      }

      user.step = user.resumeStep || "MENU";
      user.resumeStep = null;
      user.awaitingResumeDecision = false;
      await delay(1000);
      await sendResumePrompt({ user, sendMessage, automation });
      return;
    }

    /* ===============================
       APPOINTMENT DATE
       =============================== */
    if (user.step === "APPOINTMENT_DATE") {
      const optionIndex = extractNumber(lower);
      const optionDates = Array.isArray(user.data.appointmentDateOptions)
        ? user.data.appointmentDateOptions
        : [];
      let chosenDate = null;
      if (optionIndex && optionDates.length) {
        const idx = Number(optionIndex) - 1;
        if (optionDates[idx]) {
          chosenDate = startOfDay(new Date(optionDates[idx]));
        }
      }

      const directDateTime = parseDateTimeFromText(messageText);
      if (directDateTime && isValid(directDateTime)) {
        if (isPastDateTime(directDateTime)) {
          await sendMessage("You have selected past date. Please check and tell again.");
          await sendAppointmentDateOptions({ sendMessage, user });
          return;
        }
        await bookAppointment({
          adminId: assignedAdminId,
          user,
          from: sender,
          phone,
          sendMessage,
          slot: directDateTime,
          appointmentType: user.data.appointmentType,
          client,
          users,
        });
        return;
      }

      const parsedDate = chosenDate || parseDateFromText(messageText);
      if (!parsedDate || !isValid(parsedDate)) {
        await sendMessage("Please share a date or choose an option below.");
        await sendAppointmentDateOptions({ sendMessage, user });
        return;
      }
      if (isPastDate(parsedDate)) {
        await sendMessage("You have selected past date. Please check and tell again.");
        await sendAppointmentDateOptions({ sendMessage, user });
        return;
      }
      if (!withinAppointmentWindow(parsedDate)) {
        await sendMessage(
          `We can only book appointments within ${APPOINTMENT_WINDOW_MONTHS} months. Please choose a nearer date.`
        );
        await sendAppointmentDateOptions({ sendMessage, user });
        return;
      }

      user.data.appointmentDate = parsedDate.toISOString();
      user.step = "APPOINTMENT_TIME";
      await sendAppointmentTimeOptions({
        sendMessage,
        user,
        adminId: assignedAdminId,
        date: parsedDate,
      });
      return;
    }

    /* ===============================
       APPOINTMENT TIME
       =============================== */
    if (user.step === "APPOINTMENT_TIME") {
      const optionIndex = extractNumber(lower);
      const optionTimes = Array.isArray(user.data.appointmentTimeOptions)
        ? user.data.appointmentTimeOptions
        : [];
      let slot = null;
      if (optionIndex && optionTimes.length) {
        const idx = Number(optionIndex) - 1;
        if (optionTimes[idx]) {
          slot = new Date(optionTimes[idx]);
        }
      }

      if (!slot) {
        const directDateTime = parseDateTimeFromText(messageText);
        if (directDateTime && isValid(directDateTime)) {
          if (isPastDateTime(directDateTime)) {
            await sendMessage("You have selected past date. Please check and tell again.");
            if (isBefore(directDateTime, startOfDay(new Date()))) {
              await sendAppointmentDateOptions({ sendMessage, user });
              user.step = "APPOINTMENT_DATE";
            } else {
              await sendAppointmentTimeOptions({
                sendMessage,
                user,
                adminId: assignedAdminId,
                date: startOfDay(directDateTime),
              });
            }
            return;
          }
          slot = directDateTime;
        } else {
          const time = parseTimeFromText(messageText);
          const baseDate = user.data.appointmentDate
            ? new Date(user.data.appointmentDate)
            : null;
          if (time && baseDate && isValid(baseDate)) {
            slot = setMinutes(setHours(baseDate, time.hour), time.minute);
          }
        }
      }

      if (!slot || !isValid(slot)) {
        await sendMessage("Please select a time from the list or send a time.");
        const baseDate = user.data.appointmentDate
          ? new Date(user.data.appointmentDate)
          : null;
        if (!baseDate || !isValid(baseDate)) {
          await sendAppointmentDateOptions({ sendMessage, user });
          user.step = "APPOINTMENT_DATE";
          return;
        }
        await sendAppointmentTimeOptions({
          sendMessage,
          user,
          adminId: assignedAdminId,
          date: baseDate,
        });
        return;
      }
      if (isPastDateTime(slot)) {
        await sendMessage("You have selected past date. Please check and tell again.");
        if (isBefore(slot, startOfDay(new Date()))) {
          await sendAppointmentDateOptions({ sendMessage, user });
          user.step = "APPOINTMENT_DATE";
          return;
        }
        const baseDate = user.data.appointmentDate
          ? new Date(user.data.appointmentDate)
          : startOfDay(slot);
        if (!baseDate || !isValid(baseDate)) {
          await sendAppointmentDateOptions({ sendMessage, user });
          user.step = "APPOINTMENT_DATE";
          return;
        }
        await sendAppointmentTimeOptions({
          sendMessage,
          user,
          adminId: assignedAdminId,
          date: baseDate,
        });
        return;
      }

      await bookAppointment({
        adminId: assignedAdminId,
        user,
        from: sender,
        phone,
        sendMessage,
        slot,
        appointmentType: user.data.appointmentType,
        client,
        users,
      });
      return;
    }

    /* ===============================
       STEP 1: START (NEW USER)
       =============================== */
    if (user.step === "START") {
      const startNumber = extractNumber(lower);
      const mainIntent = ["1", "2", "3"].includes(startNumber)
        ? startNumber === "1"
          ? "SERVICES"
          : startNumber === "2"
          ? "PRODUCTS"
          : "EXECUTIVE"
        : automation.detectMainIntent(lower);
      const matchedService = ["1", "2", "3"].includes(startNumber)
        ? null
        : matchOption(lower, automation.serviceOptions);
      const matchedProduct = ["1", "2", "3"].includes(startNumber)
        ? null
        : matchOption(lower, automation.productOptions);
      const resolvedIntent =
        mainIntent || (matchedService ? "SERVICES" : matchedProduct ? "PRODUCTS" : null);

      await delay(1000);
      if (resolvedIntent === "SERVICES") {
        user.data.reason = "Services";
        if (matchedService && matchedService.id === "executive") {
          await sendMessage("Sure 👍\nPlease tell us briefly *how we can help you today*.");
          user.step = "EXECUTIVE_MESSAGE";
          return;
        }
        if (matchedService?.bookable) {
          user.data.reason = "Appointment";
          await startAppointmentFlow({
            user,
            sendMessage,
            appointmentType: matchedService.label,
          });
          return;
        }
        if (matchedService && matchedService.id !== "main_menu") {
          user.data.serviceType = matchedService.label;
          await sendMessage(
            matchedService.prompt ||
              "Please share your service details (DOB, time, place, and concern)."
          );
          user.step = "SERVICE_DETAILS";
          return;
        }
        await sendMessage(automation.servicesMenuText);
        user.step = "SERVICES_MENU";
        return;
      }
      if (resolvedIntent === "PRODUCTS") {
        user.data.reason = "Products";
        if (matchedProduct && matchedProduct.id !== "main_menu") {
          user.data.productType = matchedProduct.label;
          user.data.productDetailsPrompt =
            matchedProduct.prompt || automation.productDetailsPrompt;
          await sendMessage(user.data.productDetailsPrompt);
          user.step = "PRODUCT_REQUIREMENTS";
          return;
        }
        await sendMessage(automation.productsMenuText);
        user.step = "PRODUCTS_MENU";
        return;
      }
      if (resolvedIntent === "EXECUTIVE") {
        user.data.reason = "Talk to an Executive";
        await sendMessage("Sure 👍\nPlease tell us briefly *how we can help you today*.");
        user.step = "EXECUTIVE_MESSAGE";
        return;
      }

      await sendMessage(automation.mainMenuText);
      user.step = "MENU";
      return;
    }

    /* ===============================
       STEP 1B: START (RETURNING USER)
       =============================== */
    if (user.step === "MENU" && user.isReturningUser && (lower === "hi" || lower === "hello")) {
      await delay(1000);
      await sendMessage(automation.returningMenuText(user.name));
      return;
    }

    /* ===============================
       STEP 2: MENU
       =============================== */
    if (user.step === "MENU") {
      const number = extractNumber(lower);
      const isNumericMenuChoice = ["1", "2", "3"].includes(number);
      const mainIntent = automation.detectMainIntent(lower);
      const matchedService = isNumericMenuChoice ? null : matchOption(lower, automation.serviceOptions);
      const matchedProduct = isNumericMenuChoice ? null : matchOption(lower, automation.productOptions);

      let mainChoice = null;
      if (["1", "2", "3"].includes(number)) {
        mainChoice = number === "1" ? "SERVICES" : number === "2" ? "PRODUCTS" : "EXECUTIVE";
      } else if (mainIntent) {
        mainChoice = mainIntent;
      } else if (matchedService) {
        mainChoice = "SERVICES";
      } else if (matchedProduct) {
        mainChoice = "PRODUCTS";
      }

      if (!mainChoice) {
        await sendMessage("Please reply with 1, 2, or 3, or type your need 🙂");
        return;
      }

      user.data.reason =
        mainChoice === "SERVICES"
          ? "Services"
          : mainChoice === "PRODUCTS"
          ? "Products"
          : "Talk to an Executive";

      await delay(1000);
      if (mainChoice === "SERVICES" && matchedService && matchedService.id === "executive") {
        await sendMessage("Sure 👍\nPlease tell us briefly *how we can help you today*.");
        user.step = "EXECUTIVE_MESSAGE";
        return;
      }
      if (mainChoice === "SERVICES" && matchedService?.bookable) {
        user.data.reason = "Appointment";
        await startAppointmentFlow({
          user,
          sendMessage,
          appointmentType: matchedService.label,
        });
        return;
      }
      if (mainChoice === "SERVICES" && matchedService && matchedService.id !== "main_menu") {
        user.data.serviceType = matchedService.label;
        await sendMessage(
          matchedService.prompt ||
            "Please share your service details (DOB, time, place, and concern)."
        );
        user.step = "SERVICE_DETAILS";
        return;
      }
      if (mainChoice === "PRODUCTS" && matchedProduct && matchedProduct.id !== "main_menu") {
        user.data.productType = matchedProduct.label;
        user.data.productDetailsPrompt =
          matchedProduct.prompt || automation.productDetailsPrompt;
        await sendMessage(user.data.productDetailsPrompt);
        user.step = "PRODUCT_REQUIREMENTS";
        return;
      }
      if (mainChoice === "SERVICES") {
        await sendMessage(automation.servicesMenuText);
        user.step = "SERVICES_MENU";
        return;
      }
      if (mainChoice === "PRODUCTS") {
        await sendMessage(automation.productsMenuText);
        user.step = "PRODUCTS_MENU";
        return;
      }
      await sendMessage("Sure 👍\nPlease tell us briefly *how we can help you today*.");
      user.step = "EXECUTIVE_MESSAGE";
      return;
    }

    /* ===============================
       STEP 3: NAME
       =============================== */
    if (user.step === "ASK_NAME") {
      const normalizedName = sanitizeNameUpper(messageText);
      if (!normalizedName) {
        await sendMessage("Please share a valid name.");
        return;
      }
      user.data.name = normalizedName;
      user.name = normalizedName;

      await maybeFinalizeLead({
        user,
        from: sender,
        phone,
        assignedAdminId,
        client,
        users,
        sendMessage,
      });
      return;
    }

    /* ===============================
       STEP 4: EMAIL
       =============================== */
    if (user.step === "ASK_EMAIL") {
      const normalizedEmail = sanitizeEmail(messageText);
      user.data.email = normalizedEmail;
      user.email = normalizedEmail;
      user.data.emailChecked = true;

      await maybeFinalizeLead({
        user,
        from: sender,
        phone,
        assignedAdminId,
        client,
        users,
        sendMessage,
      });
      return;
    }

    /* ===============================
       STEP 4B: SERVICES MENU
       =============================== */
    if (user.step === "SERVICES_MENU") {
      const selectedService = matchOption(lower, automation.serviceOptions);
      if (!selectedService) {
        await sendMessage("Please choose a service from the menu 🙂");
        return;
      }

      if (selectedService.id === "main_menu") {
        await delay(1000);
        await sendMessage(automation.mainMenuText);
        user.step = "MENU";
        return;
      }

      if (selectedService.id === "executive") {
        user.data.reason = "Talk to an Executive";
        await delay(1000);
        await sendMessage("Sure 👍\nPlease tell us briefly *how we can help you today*.");
        user.step = "EXECUTIVE_MESSAGE";
        return;
      }

      if (selectedService.bookable) {
        user.data.reason = "Appointment";
        await delay(500);
        await startAppointmentFlow({
          user,
          sendMessage,
          appointmentType: selectedService.label,
        });
        return;
      }

      user.data.reason = "Services";
      user.data.serviceType = selectedService.label;

      await delay(1000);
      await sendMessage(
        selectedService.prompt ||
          "Please share your service details (DOB, time, place, and concern)."
      );
      user.step = "SERVICE_DETAILS";
      return;
    }

    /* ===============================
       STEP 4C: PRODUCTS MENU
       =============================== */
    if (user.step === "PRODUCTS_MENU") {
      const selectedProduct = matchOption(lower, automation.productOptions);
      if (!selectedProduct) {
        await sendMessage("Please choose a product from the menu 🙂");
        return;
      }

      if (selectedProduct.id === "main_menu") {
        await delay(1000);
        await sendMessage(automation.mainMenuText);
        user.step = "MENU";
        return;
      }

      user.data.reason = "Products";
      user.data.productType = selectedProduct.label;

      await delay(1000);
      user.data.productDetailsPrompt =
        selectedProduct.prompt || automation.productDetailsPrompt;
      await sendMessage(user.data.productDetailsPrompt);
      user.step = "PRODUCT_REQUIREMENTS";
      return;
    }

    /* ===============================
       STEP 5: SERVICE DETAILS
       =============================== */
    if (user.step === "SERVICE_DETAILS") {
      user.data.serviceDetails = sanitizeText(messageText, 1000);
      user.data.message = buildRequirementSummary({ user, phone });

      await maybeFinalizeLead({
        user,
        from: sender,
        phone,
        assignedAdminId,
        client,
        users,
        sendMessage,
      });
      return;
    }

    /* ===============================
       STEP 6: PRODUCT REQUIREMENTS
       =============================== */
    if (user.step === "PRODUCT_REQUIREMENTS") {
      user.data.productDetails = sanitizeText(messageText, 1000);

      await delay(1000);
      await sendMessage(
        "Please share your *full delivery address with pin code* (पूरा पता + पिन कोड)."
      );
      user.step = "PRODUCT_ADDRESS";
      return;
    }

    /* ===============================
       STEP 7: PRODUCT ADDRESS
       =============================== */
    if (user.step === "PRODUCT_ADDRESS") {
      user.data.address = sanitizeText(messageText, 600);

      await delay(1000);
      await sendMessage("Alternate contact number (optional). If none, reply *NA*.");
      user.step = "PRODUCT_ALT_CONTACT";
      return;
    }

    /* ===============================
       STEP 8: PRODUCT ALT CONTACT
       =============================== */
    if (user.step === "PRODUCT_ALT_CONTACT") {
      const altContact = sanitizePhone(messageText);
      user.data.altContact = altContact || "NA";
      user.data.message = buildRequirementSummary({ user, phone });

      await maybeFinalizeLead({
        user,
        from: sender,
        phone,
        assignedAdminId,
        client,
        users,
        sendMessage,
      });
      return;
    }

    /* ===============================
       STEP 9: EXECUTIVE MESSAGE
       =============================== */
    if (user.step === "EXECUTIVE_MESSAGE") {
      user.data.executiveMessage = sanitizeText(messageText, 1000);
      user.data.message = buildRequirementSummary({ user, phone });

      await maybeFinalizeLead({
        user,
        from: sender,
        phone,
        assignedAdminId,
        client,
        users,
        sendMessage,
      });
      return;
    }
  } catch (err) {
    console.error("❌ Automation error:", err);
  }
};

function attachAutomationHandlers(session) {
  const { client } = session;
  if (session.state?.handlersAttached) return;
  session.state.handlersAttached = true;

  /* ===============================
     🔥 AUTOMATION LOGIC
     =============================== */
  client.on("message", async (message) => {
    await handleIncomingMessage({ session, message });
  });
}

const RECOVERY_WINDOW_HOURS = Number(process.env.WHATSAPP_RECOVERY_WINDOW_HOURS || 24);
const RECOVERY_BATCH_LIMIT = Number(process.env.WHATSAPP_RECOVERY_BATCH_LIMIT || 20);

async function fetchPendingIncomingMessages(adminId) {
  const windowInterval = `${RECOVERY_WINDOW_HOURS} hours`;
  const [rows] = await db.query(
    `
      SELECT
        c.id as user_id,
        c.phone,
        mi.message_text as incoming_text,
        mi.created_at as incoming_at,
        mo.message_text as outgoing_text,
        mo.created_at as outgoing_at
      FROM contacts c
      JOIN LATERAL (
        SELECT m.message_text, m.created_at
        FROM messages m
        WHERE m.user_id = c.id
          AND m.admin_id = ?
          AND m.message_type = 'incoming'
          AND m.created_at >= NOW() - ($2::interval)
        ORDER BY m.created_at DESC
        LIMIT 1
      ) mi ON true
      LEFT JOIN LATERAL (
        SELECT m.message_text, m.created_at
        FROM messages m
        WHERE m.user_id = c.id
          AND m.admin_id = ?
          AND m.message_type = 'outgoing'
        ORDER BY m.created_at DESC
        LIMIT 1
      ) mo ON true
      WHERE mi.created_at > COALESCE(mo.created_at, '1970-01-01'::timestamptz)
      ORDER BY mi.created_at ASC
      LIMIT ?
    `,
    [adminId, windowInterval, adminId, RECOVERY_BATCH_LIMIT]
  );
  return rows || [];
}

async function recoverPendingMessages(session) {
  const adminId = session?.adminId;
  if (!Number.isFinite(adminId)) return;
  if (!session?.state?.isReady) return;

  const adminProfile = await getAdminAutomationProfile(adminId);
  const aiSettings = await getAdminAISettings(adminId);
  const profession = adminProfile?.profession || DEFAULT_PROFESSION;
  if (!aiSettings?.ai_enabled && !ALLOWED_AUTOMATION_PROFESSIONS.has(profession)) {
    return;
  }

  const pending = await fetchPendingIncomingMessages(adminId);
  if (!pending.length) return;

  for (const row of pending) {
    const normalized = String(row?.phone || "").replace(/[^\d]/g, "");
    if (!normalized) continue;
    await handleIncomingMessage({
      session,
      from: `${normalized}@c.us`,
      text: row.incoming_text,
      skipLog: true,
      skipDuplicateCheck: true,
      lastOutgoingText: row.outgoing_text,
    });
    await delay(500);
  }
}

/* ===============================
   INIT
   =============================== */
// Start the client via startWhatsApp() from the server.
