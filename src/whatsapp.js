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

const isMissingColumnError = (error) =>
  Boolean(error) &&
  (error.code === "42703" || String(error.message || "").toLowerCase().includes("column"));

const getAdminAutomationProfile = async (adminId) => {
  if (!Number.isFinite(adminId)) return null;
  const cached = adminProfileCache.get(adminId);
  const now = Date.now();
  if (cached && now - cached.at < ADMIN_PROFILE_TTL_MS) {
    return cached.data;
  }
  let rows;
  try {
    [rows] = await db.query(
      `SELECT business_type, business_category, automation_enabled
       FROM admins
       WHERE id = ?
       LIMIT 1`,
      [adminId]
    );
  } catch (error) {
    if (!isMissingColumnError(error)) {
      throw error;
    }
    [rows] = await db.query(
      `SELECT business_type, business_category
       FROM admins
       WHERE id = ?
       LIMIT 1`,
      [adminId]
    );
  }
  const data =
    rows[0] || {
      business_type: "both",
      business_category: "General",
      automation_enabled: true,
    };
  if (typeof data.automation_enabled !== "boolean") {
    data.automation_enabled = true;
  }
  adminProfileCache.set(adminId, { at: now, data });
  return data;
};

const getContactByPhone = async (phone) => {
  let rows;
  try {
    [rows] = await db.query(
      `SELECT id, name, email, assigned_admin_id, automation_disabled
       FROM contacts
       WHERE phone = ? OR regexp_replace(phone, '\\D', '', 'g') = ?
       LIMIT 1`,
      [phone, phone]
    );
  } catch (error) {
    if (!isMissingColumnError(error)) {
      throw error;
    }
    [rows] = await db.query(
      `SELECT id, name, email, assigned_admin_id
       FROM contacts
       WHERE phone = ? OR regexp_replace(phone, '\\D', '', 'g') = ?
       LIMIT 1`,
      [phone, phone]
    );
    rows = rows.map((row) => ({ ...row, automation_disabled: false }));
  }
  return rows || [];
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
const TRACK_ORDER_KEYWORDS = [
  "track",
  "tracking",
  "track order",
  "order status",
  "where is my order",
  "status",
  "delivery update",
];
const YES_KEYWORDS = ["yes", "y", "haan", "ha", "ok", "okay", "confirm", "1"];
const NO_KEYWORDS = ["no", "n", "2", "other", "view other", "change"];
const PAYMENT_LINK = process.env.WHATSAPP_PAYMENT_LINK || "";

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

const normalizePriceLabelInr = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.includes("₹")) {
    return text.replace(/₹\s*/g, "₹ ").replace(/\s{2,}/g, " ").trim();
  }
  let normalized = text.replace(/^\s*(?:inr|rs\.?|rupees?)\s*/i, "₹ ");
  if (!normalized.includes("₹") && /^\d/.test(normalized)) {
    normalized = `₹ ${normalized}`;
  }
  return normalized.replace(/\s{2,}/g, " ").trim();
};

const formatCatalogDuration = (item) => {
  const durationValue = Number(item?.duration_value);
  const durationUnit = String(item?.duration_unit || "").trim().toLowerCase();
  if (Number.isFinite(durationValue) && durationValue > 0 && durationUnit) {
    const normalizedUnit = durationValue === 1 ? durationUnit.replace(/s$/, "") : durationUnit;
    return `${durationValue} ${normalizedUnit}`;
  }
  const durationMinutes = Number(item?.duration_minutes);
  if (Number.isFinite(durationMinutes) && durationMinutes > 0) {
    return `${durationMinutes} min`;
  }
  return "";
};

const formatCatalogPack = (item) => {
  const quantityValue = Number(item?.quantity_value);
  if (!Number.isFinite(quantityValue) || quantityValue <= 0) return "";
  const quantityUnit = sanitizeText(item?.quantity_unit || "unit", 40);
  return `${quantityValue} ${quantityUnit || "unit"}`;
};

const formatMenuLine = (index, item) => {
  const parts = [`${index}️⃣ ${item.name}`];
  const priceLabel = normalizePriceLabelInr(item?.price_label);
  const durationLabel = formatCatalogDuration(item);
  const packLabel = formatCatalogPack(item);
  if (priceLabel) parts.push(`- ${priceLabel}`);
  if (durationLabel) parts.push(`(${durationLabel})`);
  if (item?.item_type === "product" && packLabel) {
    parts.push(`[${packLabel}]`);
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

const parsePriceAmount = (value) => {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number(value);
  }
  const raw = String(value);
  if (!raw.trim()) return null;
  const cleaned = raw.replace(/,/g, "");
  const matched = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!matched) return null;
  const numeric = Number(matched[1]);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatInr = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "N/A";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    return `₹ ${amount.toFixed(0)}`;
  }
};

const buildProductSelectionMessage = (automation) =>
  automation?.productsMenuText ||
  [
    "Here are our products:",
    "_No products available right now._",
    "",
    "_Reply with product number_",
  ].join("\n");

const buildProductDetailsMessage = (product) => {
  const lines = [`✨ ${product?.label || "Selected Product"}`];
  if (product?.category) {
    lines.push(`Category: ${product.category}`);
  }
  if (product?.description) {
    lines.push(`Details: ${product.description}`);
  } else {
    lines.push("✔ Premium quality");
    lines.push("✔ Fast support");
  }
  if (product?.packLabel) {
    lines.push(`📦 Pack: ${product.packLabel}`);
  }
  if (product?.priceLabel) {
    lines.push(`💰 Price: ${normalizePriceLabelInr(product.priceLabel)}`);
  } else if (Number.isFinite(product?.priceAmount)) {
    lines.push(`💰 Price: ${formatInr(product.priceAmount)}`);
  }
  lines.push("");
  lines.push("Would you like to order this?");
  lines.push("1️⃣ Yes");
  lines.push("2️⃣ View Other Products");
  return lines.join("\n");
};

const computeProductTotal = (product, quantity) => {
  const unit = Number(product?.priceAmount);
  const qty = Number(quantity);
  if (!Number.isFinite(unit) || !Number.isFinite(qty)) return null;
  if (unit < 0 || qty <= 0) return null;
  return unit * qty;
};

const buildOrderSummaryMessage = (user) => {
  const product = user?.data?.selectedProduct || {};
  const quantity = Number(user?.data?.productQuantity || 1);
  const total = computeProductTotal(product, quantity);
  const customerName = sanitizeNameUpper(user?.data?.name || user?.name) || "N/A";
  const address = sanitizeText(user?.data?.address || "", 500) || "N/A";
  const phone = sanitizePhone(user?.data?.deliveryPhone || "") || "N/A";
  const note = sanitizeText(user?.data?.deliveryNote || "NO", 300) || "NO";

  const lines = ["🧾 Order Summary", ""];
  lines.push(`Product: ${product?.label || "N/A"}`);
  lines.push(`Quantity: ${quantity}${product?.packLabel ? ` x ${product.packLabel}` : ""}`);
  lines.push(`Total: ${total == null ? "N/A" : formatInr(total)}`);
  lines.push("");
  lines.push(`Name: ${customerName}`);
  lines.push(`Address: ${address}`);
  lines.push(`Phone: ${phone}`);
  lines.push(`Delivery Note: ${note}`);
  lines.push("");
  lines.push("Type *CONFIRM* to continue.");
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
    let rows;
    try {
      [rows] = await db.query(
        `SELECT id, item_type, name, category, description, price_label, duration_value, duration_unit, duration_minutes, quantity_value, quantity_unit, details_prompt, keywords, is_active, sort_order, is_bookable
         FROM catalog_items
         WHERE admin_id = ?
         ORDER BY sort_order ASC, name ASC, id ASC`,
        [adminId]
      );
    } catch (error) {
      if (!isMissingColumnError(error)) throw error;
      const [legacyRows] = await db.query(
        `SELECT id, item_type, name, category, description, price_label, duration_minutes, details_prompt, keywords, is_active, sort_order, is_bookable
         FROM catalog_items
         WHERE admin_id = ?
         ORDER BY sort_order ASC, name ASC, id ASC`,
        [adminId]
      );
      rows = (legacyRows || []).map((row) => ({
        ...row,
        duration_value: row.duration_minutes || null,
        duration_unit: row.duration_minutes ? "minutes" : null,
        quantity_value: null,
        quantity_unit: null,
      }));
    }

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
  const nextAutomation = { ...baseAutomation };

  const serviceLabel = baseAutomation.serviceLabel || "Services";
  const productLabel = "View Products";
  const trackOrderLabel = "Track Order";
  const execLabel = "Talk to Support";
  const supportsServices = baseAutomation.supportsServices !== false;
  const supportsProducts = baseAutomation.supportsProducts !== false;

  const serviceOptions = [];
  const serviceItems = catalog?.services || [];
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
  const productItems = catalog?.products || [];
  productItems.forEach((item, idx) => {
    const normalizedPriceLabel = normalizePriceLabelInr(item.price_label || "");
    productOptions.push({
      id: `product_${item.id}`,
      number: String(idx + 1),
      label: item.name,
      keywords: buildOptionKeywords(item),
      prompt: item.details_prompt,
      description: sanitizeText(item.description || "", 400),
      category: sanitizeText(item.category || "General", 120),
      priceLabel: sanitizeText(normalizedPriceLabel, 120),
      priceAmount: parsePriceAmount(normalizedPriceLabel),
      quantityValue: Number(item.quantity_value),
      quantityUnit: sanitizeText(item.quantity_unit || "", 40),
      packLabel: formatCatalogPack(item),
      productId: item.id,
    });
  });
  productOptions.push({
    id: "main_menu",
    number: String(productItems.length + 1),
    label: "Main Menu",
    keywords: MAIN_MENU_KEYWORDS,
  });

  const mainMenuChoices = [];
  if (supportsProducts) {
    mainMenuChoices.push({
      id: "PRODUCTS",
      number: String(mainMenuChoices.length + 1),
      label: productLabel,
    });
    mainMenuChoices.push({
      id: "TRACK_ORDER",
      number: String(mainMenuChoices.length + 1),
      label: trackOrderLabel,
    });
  } else if (supportsServices && serviceItems.length > 0) {
    mainMenuChoices.push({
      id: "SERVICES",
      number: String(mainMenuChoices.length + 1),
      label: serviceLabel,
    });
  }
  mainMenuChoices.push({
    id: "EXECUTIVE",
    number: String(mainMenuChoices.length + 1),
    label: execLabel,
  });

  const serviceChoice = mainMenuChoices.find((choice) => choice.id === "SERVICES");
  const productChoice = mainMenuChoices.find((choice) => choice.id === "PRODUCTS");
  const trackOrderChoice = mainMenuChoices.find((choice) => choice.id === "TRACK_ORDER");
  const executiveChoice = mainMenuChoices.find((choice) => choice.id === "EXECUTIVE");

  nextAutomation.mainMenuChoices = mainMenuChoices;
  nextAutomation.supportsServices = Boolean(serviceChoice);
  nextAutomation.supportsProducts = Boolean(productChoice);
  nextAutomation.supportsTrackOrder = Boolean(trackOrderChoice);
  nextAutomation.execLabel = execLabel;
  nextAutomation.mainMenuText = buildMainMenuText({
    brandName: baseAutomation.brandName || "Our Store",
    serviceLabel,
    productLabel,
    execLabel,
    menuChoices: mainMenuChoices,
  });
  nextAutomation.returningMenuText = (name) =>
    buildReturningMenuText(
      {
        serviceLabel,
        productLabel,
        execLabel,
        menuChoices: mainMenuChoices,
      },
      name
    );

  nextAutomation.servicesMenuText = buildCatalogMenuText({
    title: `${serviceLabel}:`,
    items: serviceItems,
    footer: "_Reply with a number or type the service name_",
    includeExecutive: true,
    execLabel,
    includeMainMenu: true,
  });
  nextAutomation.productsMenuText = buildCatalogMenuText({
    title: "Here are our products:",
    items: productItems,
    footer: "_Reply with product number_",
    includeExecutive: false,
    includeMainMenu: true,
  });
  nextAutomation.serviceOptions = serviceOptions;
  nextAutomation.productOptions = productOptions;
  nextAutomation.detectMainIntent = (input) => {
    if (trackOrderChoice && textHasAny(input, TRACK_ORDER_KEYWORDS)) return "TRACK_ORDER";
    if (textHasAny(input, EXECUTIVE_KEYWORDS)) return "EXECUTIVE";
    if (
      serviceChoice &&
      textHasAny(input, [serviceLabel.toLowerCase(), "service", "services", "appointment", "booking"])
    ) {
      return "SERVICES";
    }
    if (
      productChoice &&
      textHasAny(input, [productLabel.toLowerCase(), "product", "products", "view products", "buy"])
    ) {
      return "PRODUCTS";
    }
    if (executiveChoice && textHasAny(input, ["support", "help", "agent", "human", "talk"])) {
      return "EXECUTIVE";
    }
    return null;
  };

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

const DEFAULT_MAIN_MENU_CHOICES = [
  { id: "PRODUCTS", number: "1", label: "View Products" },
  { id: "TRACK_ORDER", number: "2", label: "Track Order" },
  { id: "EXECUTIVE", number: "3", label: "Talk to Support" },
];

const getMainMenuChoices = (automation) =>
  Array.isArray(automation?.mainMenuChoices) && automation.mainMenuChoices.length
    ? automation.mainMenuChoices
    : DEFAULT_MAIN_MENU_CHOICES;

const getMainChoiceFromNumber = (number, automation) => {
  if (!number) return null;
  const match = getMainMenuChoices(automation).find((choice) => choice.number === number);
  return match?.id || null;
};

const getMainMenuReplyHint = (automation) => {
  const choices = getMainMenuChoices(automation);
  const labels = choices.map((choice) => choice.number).join(", ");
  return `_Reply with ${labels}, or type your need_`;
};

const buildMainMenuLines = (choices) =>
  choices.map((choice) => `${choice.number}️⃣ ${choice.label}`);

const buildMainMenuText = ({
  brandName,
  serviceLabel,
  productLabel,
  execLabel,
  menuChoices = null,
}) => {
  const resolvedChoices =
    menuChoices ||
    [
      { id: "PRODUCTS", number: "1", label: productLabel || "View Products" },
      { id: "TRACK_ORDER", number: "2", label: "Track Order" },
      { id: "EXECUTIVE", number: "3", label: execLabel || "Talk to Support" },
    ];
  return [
    `Hi 👋 Welcome to ${brandName || "Our Store"}`,
    "",
    "What would you like to do today?",
    "",
    ...buildMainMenuLines(resolvedChoices),
    "",
    getMainMenuReplyHint({ mainMenuChoices: resolvedChoices }),
  ].join("\n");
};

const buildReturningMenuText = (
  { serviceLabel, productLabel, execLabel, menuChoices = null },
  name
) => {
  const resolvedChoices =
    menuChoices ||
    [
      { id: "PRODUCTS", number: "1", label: productLabel || "View Products" },
      { id: "TRACK_ORDER", number: "2", label: "Track Order" },
      { id: "EXECUTIVE", number: "3", label: execLabel || "Talk to Support" },
    ];
  return [
    `Welcome back ${name} 👋`,
    "",
    "How can I help you today?",
    "",
    ...buildMainMenuLines(resolvedChoices),
    "",
    getMainMenuReplyHint({ mainMenuChoices: resolvedChoices }),
  ].join("\n");
};

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

const normalizeBusinessType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["product", "service", "both"].includes(normalized)) return normalized;
  return "both";
};

const DYNAMIC_AUTOMATION_PROFILE = {
  id: "dynamic",
  brandName: "Our Store",
  serviceLabel: "Services",
  productLabel: "View Products",
  execLabel: "Talk to Support",
  supportsAppointments: true,
  appointmentKeywords: ["appointment", "booking", "schedule", "consultation", "visit", "meeting"],
  productDetailsPrompt:
    "Please share product name, quantity, and any specific requirements.",
  serviceOptions: [],
  productOptions: [],
  detectMainIntent: buildDetectMainIntent({
    serviceKeywords: ["service", "services", "appointment", "booking", "consultation", "visit"],
    productKeywords: ["product", "products", "order", "buy", "price", "catalog"],
  }),
};

const buildAutomationProfileForBusinessType = (businessType, brandName = "Our Store") => {
  const normalized = normalizeBusinessType(businessType);
  const supportsServices = normalized !== "product";
  const supportsProducts = normalized !== "service";
  const supportsAppointments = normalized !== "product";
  const menuChoices = [];

  if (supportsProducts) {
    menuChoices.push({ id: "PRODUCTS", number: String(menuChoices.length + 1), label: "View Products" });
    menuChoices.push({ id: "TRACK_ORDER", number: String(menuChoices.length + 1), label: "Track Order" });
  } else if (supportsServices) {
    menuChoices.push({ id: "SERVICES", number: String(menuChoices.length + 1), label: "Services" });
  }
  menuChoices.push({
    id: "EXECUTIVE",
    number: String(menuChoices.length + 1),
    label: DYNAMIC_AUTOMATION_PROFILE.execLabel,
  });

  return {
    ...DYNAMIC_AUTOMATION_PROFILE,
    brandName: sanitizeText(brandName, 120) || "Our Store",
    supportsAppointments,
    supportsServices,
    supportsProducts,
    mainMenuChoices: menuChoices,
    mainMenuText: buildMainMenuText({
      brandName: sanitizeText(brandName, 120) || "Our Store",
      serviceLabel: DYNAMIC_AUTOMATION_PROFILE.serviceLabel,
      productLabel: DYNAMIC_AUTOMATION_PROFILE.productLabel,
      execLabel: DYNAMIC_AUTOMATION_PROFILE.execLabel,
      menuChoices,
    }),
    returningMenuText: (name) =>
      buildReturningMenuText(
        {
          serviceLabel: DYNAMIC_AUTOMATION_PROFILE.serviceLabel,
          productLabel: DYNAMIC_AUTOMATION_PROFILE.productLabel,
          execLabel: DYNAMIC_AUTOMATION_PROFILE.execLabel,
          menuChoices,
        },
        name
      ),
  };
};

const getAutomationProfile = (businessType, brandName = "Our Store") =>
  buildAutomationProfileForBusinessType(normalizeBusinessType(businessType), brandName);

const parseAllowedAutomationBusinessTypes = () => {
  const raw = String(process.env.WHATSAPP_AUTOMATION_BUSINESS_TYPES || "").trim();
  if (!raw) {
    return new Set(["product", "service", "both"]);
  }
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => ["product", "service", "both"].includes(entry))
  );
};

const ALLOWED_AUTOMATION_BUSINESS_TYPES = parseAllowedAutomationBusinessTypes();

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
      `INSERT INTO appointments (user_id, admin_id, appointment_type, start_time, end_time, status)
       VALUES (?, ?, ?, ?, ?, 'booked')`,
      [
        user.clientId,
        adminId,
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
  if (messageText.length > 2000) {
    return { error: "Message is too long", code: "message_too_long", status: 400 };
  }
  const session = sessions.get(adminId);
  if (!session || !session.state?.isReady || !session.client) {
    return { error: "WhatsApp is not connected", code: "whatsapp_not_ready", status: 409 };
  }
  touchSession(session);

  const [rows] = await db.query(
    "SELECT id, phone FROM contacts WHERE id = ? AND assigned_admin_id = ? LIMIT 1",
    [userId, adminId]
  );
  const user = rows?.[0];
  if (!user?.phone) {
    return { error: "Contact not found for this admin", code: "contact_not_found", status: 404 };
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
      await sendMessage(buildProductSelectionMessage(automation));
      return;
    case "PRODUCT_CONFIRM_SELECTION":
      await sendMessage(buildProductDetailsMessage(user.data.selectedProduct || {}));
      return;
    case "PRODUCT_QUANTITY":
      await sendMessage("How many would you like to order?\n(Example: 1, 2, 3)");
      return;
    case "PRODUCT_CUSTOMER_NAME":
      await sendMessage("Great 👍\nCan I have your full name?");
      return;
    case "PRODUCT_CUSTOMER_ADDRESS":
      await sendMessage("Please share your delivery address.");
      return;
    case "PRODUCT_CUSTOMER_PHONE":
      await sendMessage("Your phone number for delivery updates?");
      return;
    case "PRODUCT_DELIVERY_NOTE":
      await sendMessage("Any note for delivery? (or type NO)");
      return;
    case "PRODUCT_ORDER_SUMMARY":
      await sendMessage(buildOrderSummaryMessage(user));
      return;
    case "PRODUCT_PAYMENT_METHOD":
      await sendMessage("Payment Method:\n1️⃣ Cash on Delivery\n2️⃣ Pay Now");
      return;
    case "PRODUCT_PAYMENT_CONFIRM":
      await sendMessage(
        PAYMENT_LINK
          ? `Please complete payment using this secure link 👇\n${PAYMENT_LINK}\n\nReply *DONE* after payment.`
          : "Please complete payment using the link shared by support.\nReply *DONE* after payment."
      );
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
      await sendMessage("How many would you like to order?\n(Example: 1, 2, 3)");
      return;
    case "PRODUCT_ADDRESS":
      await sendMessage("Please share your delivery address.");
      return;
    case "PRODUCT_ALT_CONTACT":
      await sendMessage("Your phone number for delivery updates?");
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
  if (normalized.includes("would you like to order this")) return "PRODUCT_CONFIRM_SELECTION";
  if (normalized.includes("how many would you like to order")) return "PRODUCT_QUANTITY";
  if (normalized.includes("can i have your full name")) return "PRODUCT_CUSTOMER_NAME";
  if (normalized.includes("please share your delivery address")) return "PRODUCT_CUSTOMER_ADDRESS";
  if (normalized.includes("delivery updates")) return "PRODUCT_CUSTOMER_PHONE";
  if (normalized.includes("any note for delivery")) return "PRODUCT_DELIVERY_NOTE";
  if (normalized.includes("order summary")) return "PRODUCT_ORDER_SUMMARY";
  if (normalized.includes("payment method")) return "PRODUCT_PAYMENT_METHOD";
  if (normalized.includes("reply *done*") || normalized.includes("reply done after payment")) {
    return "PRODUCT_PAYMENT_CONFIRM";
  }
  if (normalized.includes("please share your service details")) return "SERVICE_DETAILS";
  if (normalized.includes("full delivery address")) return "PRODUCT_CUSTOMER_ADDRESS";
  if (normalized.includes("alternate contact number")) return "PRODUCT_CUSTOMER_PHONE";
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

const fetchRecentOrdersForPhone = async ({ adminId, phone, limit = 3 }) => {
  if (!Number.isFinite(adminId) || !phone) return [];
  const normalized = sanitizePhone(phone);
  if (!normalized) return [];
  const [rows] = await db.query(
    `
      SELECT
        id,
        order_number,
        status,
        fulfillment_status,
        payment_status,
        payment_total,
        delivery_method,
        COALESCE(placed_at, created_at) AS placed_at,
        updated_at
      FROM orders
      WHERE admin_id = ?
        AND (
          customer_phone = ?
          OR regexp_replace(COALESCE(customer_phone, ''), '\\D', '', 'g') = ?
        )
      ORDER BY COALESCE(placed_at, created_at) DESC, id DESC
      LIMIT ?
    `,
    [adminId, normalized, normalized, limit]
  );
  return rows || [];
};

const toSimpleStatusLabel = (value) =>
  String(value || "new")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const isPackedOrder = (order) => {
  const status = String(order?.status || "").toLowerCase();
  const fulfillment = String(order?.fulfillment_status || "").toLowerCase();
  return ["packed", "out_for_delivery", "fulfilled"].includes(status) ||
    ["packed", "shipped", "delivered"].includes(fulfillment);
};

const isDeliveryReleased = (order) => {
  const status = String(order?.status || "").toLowerCase();
  const fulfillment = String(order?.fulfillment_status || "").toLowerCase();
  return ["out_for_delivery", "fulfilled"].includes(status) ||
    ["shipped", "delivered"].includes(fulfillment);
};

const isDeliveredOrder = (order) => {
  const status = String(order?.status || "").toLowerCase();
  const fulfillment = String(order?.fulfillment_status || "").toLowerCase();
  return status === "fulfilled" || fulfillment === "delivered";
};

const buildTrackingMessage = (orders) => {
  if (!Array.isArray(orders) || orders.length === 0) {
    return "I couldn't find any recent orders on this number.\nPlease share your order ID or contact support.";
  }
  const lines = ["📦 Delivery Updates", ""];
  orders.forEach((order, index) => {
    const ref = order.order_number || `#${order.id}`;
    const placedDate = order.placed_at ? new Date(order.placed_at) : null;
    const updatedDate = order.updated_at ? new Date(order.updated_at) : null;
    const placedAt =
      placedDate && isValid(placedDate) ? format(placedDate, "d MMM, h:mm a") : "N/A";
    const updatedAt =
      updatedDate && isValid(updatedDate) ? format(updatedDate, "d MMM, h:mm a") : "N/A";
    const packedLabel = isPackedOrder(order) ? "✅ Packed" : "❌ Not packed yet";
    const releasedLabel = isDeliveryReleased(order) ? "✅ Released" : "❌ Not released yet";
    const deliveredLabel = isDeliveredOrder(order) ? "✅ Delivered" : "⏳ In transit";
    lines.push(`${index + 1}️⃣ ${ref}`);
    lines.push(`Order Status: ${toSimpleStatusLabel(order.status)}`);
    lines.push(`Fulfillment: ${toSimpleStatusLabel(order.fulfillment_status || "unfulfilled")}`);
    lines.push(`Packed: ${packedLabel}`);
    lines.push(`Delivery Released: ${releasedLabel}`);
    lines.push(`Delivery: ${deliveredLabel}`);
    lines.push(`Payment: ${toSimpleStatusLabel(order.payment_status || "pending")}`);
    lines.push(`Placed: ${placedAt}`);
    lines.push(`Last Update: ${updatedAt}`);
    if (Number.isFinite(Number(order.payment_total))) {
      lines.push(`Amount: ${formatInr(Number(order.payment_total))}`);
    }
    if (order.delivery_method) {
      lines.push(`Method: ${sanitizeText(order.delivery_method, 40)}`);
    }
    lines.push("");
  });
  lines.push("Need help? Type SUPPORT.");
  return lines.join("\n");
};

const createWhatsAppOrder = async ({
  user,
  adminId,
  fallbackPhone,
  paymentMethod = "cod",
  paymentStatus = "pending",
}) => {
  const product = user?.data?.selectedProduct || null;
  const quantity = Number(user?.data?.productQuantity || 1);
  if (!product?.label || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Invalid product order details.");
  }

  const customerName = sanitizeNameUpper(user?.data?.name || user?.name || "Customer") || "Customer";
  const customerPhone =
    sanitizePhone(user?.data?.deliveryPhone || "") || sanitizePhone(fallbackPhone) || null;
  const customerEmail = sanitizeEmail(user?.data?.email || user?.email || "");
  const deliveryAddress = sanitizeText(user?.data?.address || "", 600);
  const deliveryNote = sanitizeText(user?.data?.deliveryNote || "", 300);
  const unitPrice = Number(product.priceAmount);
  const paymentTotal =
    Number.isFinite(unitPrice) && unitPrice >= 0 ? Number((unitPrice * quantity).toFixed(2)) : null;
  const paid = paymentStatus === "paid" && Number.isFinite(paymentTotal) ? paymentTotal : 0;
  const nowStamp = Date.now().toString().slice(-8);
  const rand = String(Math.floor(100 + Math.random() * 900));
  const orderNumber = `WA-${nowStamp}${rand}`;

  const items = [
    {
      id: product.productId || null,
      name: product.label,
      quantity,
      price: Number.isFinite(unitPrice) ? unitPrice : 0,
      price_label: normalizePriceLabelInr(product.priceLabel || null) || null,
      category: product.category || null,
      quantity_value:
        Number.isFinite(Number(product.quantityValue)) && Number(product.quantityValue) > 0
          ? Number(product.quantityValue)
          : null,
      quantity_unit: sanitizeText(product.quantityUnit || "", 40) || null,
    },
  ];
  const notes = [];
  if (deliveryNote && deliveryNote.toLowerCase() !== "no") {
    notes.push({
      id: `note-${Date.now()}`,
      message: deliveryNote,
      author: "Customer",
      created_at: new Date().toISOString(),
    });
  }

  if (user?.clientId) {
    await db.query(
      `UPDATE contacts
       SET name = COALESCE(?, name),
           email = COALESCE(?, email),
           updated_at = NOW()
       WHERE id = ?`,
      [customerName, customerEmail || null, user.clientId]
    );
  }

  const [rows] = await db.query(
    `
      INSERT INTO orders (
        admin_id,
        order_number,
        customer_name,
        customer_phone,
        customer_email,
        channel,
        status,
        fulfillment_status,
        delivery_method,
        delivery_address,
        items,
        notes,
        placed_at,
        payment_total,
        payment_paid,
        payment_status,
        payment_method,
        payment_currency,
        payment_notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, NOW(), ?, ?, ?, ?, ?, ?)
      RETURNING id, order_number, payment_total
    `,
    [
      adminId,
      orderNumber,
      customerName,
      customerPhone,
      customerEmail || null,
      "WhatsApp",
      "confirmed",
      "unfulfilled",
      "Delivery",
      deliveryAddress || null,
      JSON.stringify(items),
      JSON.stringify(notes),
      paymentTotal,
      paid,
      paymentStatus,
      paymentMethod || null,
      "INR",
      paymentMethod === "online" ? "Paid via WhatsApp flow" : "Cash on delivery",
    ]
  );
  return rows?.[0] || null;
};

const resetProductFlowData = (user) => {
  if (!user?.data) return;
  delete user.data.selectedProduct;
  delete user.data.productQuantity;
  delete user.data.deliveryPhone;
  delete user.data.deliveryNote;
  delete user.data.address;
  delete user.data.productDetails;
  delete user.data.productDetailsPrompt;
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

    const rows = await getContactByPhone(phone);

    let isReturningUser = rows.length > 0;
    let existingUser = isReturningUser
      ? {
        ...rows[0],
        name: sanitizeNameUpper(rows[0]?.name),
        email: sanitizeEmail(rows[0]?.email),
        automation_disabled: rows[0]?.automation_disabled === true,
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
          const freshRows = await getContactByPhone(phone);
          if (freshRows.length > 0) {
            existingUser = {
              ...freshRows[0],
              name: sanitizeNameUpper(freshRows[0]?.name),
              email: sanitizeEmail(freshRows[0]?.email),
              automation_disabled: freshRows[0]?.automation_disabled === true,
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
        automationDisabled: existingUser?.automation_disabled === true,
      };
    }

    const user = session.users[sender];
    user.automationDisabled = existingUser?.automation_disabled === true;
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

    const adminProfile = await getAdminAutomationProfile(assignedAdminId);
    if (adminProfile?.automation_enabled === false || user.automationDisabled) {
      return;
    }

    const aiSettings = await getAdminAISettings(assignedAdminId);
    const businessType = normalizeBusinessType(adminProfile?.business_type);
    const brandName = sanitizeText(adminProfile?.business_category || "Our Store", 120) || "Our Store";
    const baseAutomation = getAutomationProfile(businessType, brandName);
    const catalog = await getAdminCatalogItems(assignedAdminId);
    const automation = buildCatalogAutomation({ baseAutomation, catalog });
    user.data.businessType = businessType;

    const automationAllowed = ALLOWED_AUTOMATION_BUSINESS_TYPES.has(businessType);

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
      const mainChoiceFromNumber = getMainChoiceFromNumber(startNumber, automation);
      const mainIntent = mainChoiceFromNumber || automation.detectMainIntent(lower);
      const matchedService = mainChoiceFromNumber ? null : matchOption(lower, automation.serviceOptions);
      const matchedProduct = mainChoiceFromNumber ? null : matchOption(lower, automation.productOptions);
      const resolvedIntent =
        mainIntent || (matchedService ? "SERVICES" : matchedProduct ? "PRODUCTS" : null);

      await delay(1000);
      if (resolvedIntent === "TRACK_ORDER") {
        const tracked = await fetchRecentOrdersForPhone({
          adminId: assignedAdminId,
          phone: user.data.deliveryPhone || phone,
        });
        await sendMessage(buildTrackingMessage(tracked));
        user.step = "MENU";
        return;
      }
      if (resolvedIntent === "SERVICES") {
        if (!automation.supportsServices) {
          await sendMessage(automation.mainMenuText);
          user.step = "MENU";
          return;
        }
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
        if (!automation.supportsProducts) {
          await sendMessage(automation.mainMenuText);
          user.step = "MENU";
          return;
        }
        user.data.reason = "Products";
        if (matchedProduct && matchedProduct.id !== "main_menu") {
          user.data.selectedProduct = {
            id: matchedProduct.id,
            productId: matchedProduct.productId,
            label: matchedProduct.label,
            description: matchedProduct.description,
            category: matchedProduct.category,
            priceLabel: matchedProduct.priceLabel,
            priceAmount: matchedProduct.priceAmount,
            quantityValue: matchedProduct.quantityValue,
            quantityUnit: matchedProduct.quantityUnit,
            packLabel: matchedProduct.packLabel,
          };
          user.data.productType = matchedProduct.label;
          await sendMessage(buildProductDetailsMessage(user.data.selectedProduct));
          user.step = "PRODUCT_CONFIRM_SELECTION";
          return;
        }
        await sendMessage(buildProductSelectionMessage(automation));
        user.step = "PRODUCTS_MENU";
        return;
      }
      if (resolvedIntent === "EXECUTIVE") {
        user.data.reason = "Support";
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
      const mainChoiceFromNumber = getMainChoiceFromNumber(number, automation);
      const isNumericMenuChoice = Boolean(mainChoiceFromNumber);
      const mainIntent = automation.detectMainIntent(lower);
      const matchedService = isNumericMenuChoice ? null : matchOption(lower, automation.serviceOptions);
      const matchedProduct = isNumericMenuChoice ? null : matchOption(lower, automation.productOptions);

      const mainChoice =
        mainChoiceFromNumber ||
        mainIntent ||
        (matchedService ? "SERVICES" : matchedProduct ? "PRODUCTS" : null);

      if (!mainChoice) {
        await sendMessage("Please reply with a menu number, or type your need 🙂");
        return;
      }

      user.data.reason =
        mainChoice === "SERVICES"
          ? "Services"
          : mainChoice === "PRODUCTS"
            ? "Products"
            : mainChoice === "TRACK_ORDER"
              ? "Track Order"
              : "Support";

      await delay(1000);
      if (mainChoice === "TRACK_ORDER") {
        const tracked = await fetchRecentOrdersForPhone({
          adminId: assignedAdminId,
          phone: user.data.deliveryPhone || phone,
        });
        await sendMessage(buildTrackingMessage(tracked));
        user.step = "MENU";
        return;
      }
      if (mainChoice === "SERVICES" && matchedService && matchedService.id === "executive") {
        await sendMessage("Sure 👍\nPlease tell us briefly *how we can help you today*.");
        user.step = "EXECUTIVE_MESSAGE";
        return;
      }
      if (mainChoice === "SERVICES" && !automation.supportsServices) {
        await sendMessage(automation.mainMenuText);
        user.step = "MENU";
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
        user.data.selectedProduct = {
          id: matchedProduct.id,
          productId: matchedProduct.productId,
          label: matchedProduct.label,
          description: matchedProduct.description,
          category: matchedProduct.category,
          priceLabel: matchedProduct.priceLabel,
          priceAmount: matchedProduct.priceAmount,
          quantityValue: matchedProduct.quantityValue,
          quantityUnit: matchedProduct.quantityUnit,
          packLabel: matchedProduct.packLabel,
        };
        user.data.productType = matchedProduct.label;
        await sendMessage(buildProductDetailsMessage(user.data.selectedProduct));
        user.step = "PRODUCT_CONFIRM_SELECTION";
        return;
      }
      if (mainChoice === "PRODUCTS" && !automation.supportsProducts) {
        await sendMessage(automation.mainMenuText);
        user.step = "MENU";
        return;
      }
      if (mainChoice === "SERVICES") {
        await sendMessage(automation.servicesMenuText);
        user.step = "SERVICES_MENU";
        return;
      }
      if (mainChoice === "PRODUCTS") {
        await sendMessage(buildProductSelectionMessage(automation));
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
      user.data.selectedProduct = {
        id: selectedProduct.id,
        productId: selectedProduct.productId,
        label: selectedProduct.label,
        description: selectedProduct.description,
        category: selectedProduct.category,
        priceLabel: selectedProduct.priceLabel,
        priceAmount: selectedProduct.priceAmount,
        quantityValue: selectedProduct.quantityValue,
        quantityUnit: selectedProduct.quantityUnit,
        packLabel: selectedProduct.packLabel,
      };
      user.data.productType = selectedProduct.label;
      await delay(1000);
      await sendMessage(buildProductDetailsMessage(user.data.selectedProduct));
      user.step = "PRODUCT_CONFIRM_SELECTION";
      return;
    }

    /* ===============================
       STEP 4D: PRODUCT CONFIRMATION
       =============================== */
    if (user.step === "PRODUCT_CONFIRM_SELECTION") {
      const choiceNumber = extractNumber(lower);
      if (choiceNumber === "1" || YES_KEYWORDS.includes(lower) || lower.includes("yes")) {
        await delay(500);
        await sendMessage("How many would you like to order?\n(Example: 1, 2, 3)");
        user.step = "PRODUCT_QUANTITY";
        return;
      }
      if (choiceNumber === "2" || NO_KEYWORDS.includes(lower) || lower.includes("other product")) {
        await delay(500);
        await sendMessage(buildProductSelectionMessage(automation));
        user.step = "PRODUCTS_MENU";
        return;
      }
      await sendMessage("Please reply with 1 for Yes or 2 to view other products.");
      return;
    }

    /* ===============================
       STEP 4E: PRODUCT QUANTITY
       =============================== */
    if (user.step === "PRODUCT_QUANTITY" || user.step === "PRODUCT_REQUIREMENTS") {
      const quantityValue = Number(extractNumber(lower));
      if (!Number.isFinite(quantityValue) || quantityValue <= 0 || quantityValue > 999) {
        await sendMessage("Please enter a valid quantity (example: 1, 2, 3).");
        return;
      }
      user.data.productQuantity = quantityValue;
      await delay(500);
      await sendMessage("Great 👍\nCan I have your full name?");
      user.step = "PRODUCT_CUSTOMER_NAME";
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
       STEP 6: PRODUCT CUSTOMER NAME
       =============================== */
    if (user.step === "PRODUCT_CUSTOMER_NAME") {
      const normalizedName = sanitizeNameUpper(messageText);
      if (!normalizedName) {
        await sendMessage("Please share a valid full name.");
        return;
      }
      user.data.name = normalizedName;
      user.name = normalizedName;
      await delay(500);
      await sendMessage("Please share your delivery address.");
      user.step = "PRODUCT_CUSTOMER_ADDRESS";
      return;
    }

    /* ===============================
       STEP 7: PRODUCT ADDRESS
       =============================== */
    if (user.step === "PRODUCT_CUSTOMER_ADDRESS" || user.step === "PRODUCT_ADDRESS") {
      user.data.address = sanitizeText(messageText, 600);
      if (!user.data.address) {
        await sendMessage("Please share a valid delivery address.");
        return;
      }

      await delay(500);
      await sendMessage("Your phone number for delivery updates?");
      user.step = "PRODUCT_CUSTOMER_PHONE";
      return;
    }

    /* ===============================
       STEP 8: PRODUCT PHONE
       =============================== */
    if (user.step === "PRODUCT_CUSTOMER_PHONE" || user.step === "PRODUCT_ALT_CONTACT") {
      const deliveryPhone = sanitizePhone(messageText);
      if (!deliveryPhone) {
        await sendMessage("Please share a valid phone number for delivery updates.");
        return;
      }
      user.data.deliveryPhone = deliveryPhone;
      await delay(500);
      await sendMessage("Any note for delivery? (or type NO)");
      user.step = "PRODUCT_DELIVERY_NOTE";
      return;
    }

    /* ===============================
       STEP 9: PRODUCT DELIVERY NOTE
       =============================== */
    if (user.step === "PRODUCT_DELIVERY_NOTE") {
      const note = sanitizeText(messageText, 300);
      user.data.deliveryNote = !note || ["no", "na", "none"].includes(lower) ? "NO" : note;
      await delay(500);
      await sendMessage(buildOrderSummaryMessage(user));
      user.step = "PRODUCT_ORDER_SUMMARY";
      return;
    }

    /* ===============================
       STEP 10: ORDER SUMMARY CONFIRMATION
       =============================== */
    if (user.step === "PRODUCT_ORDER_SUMMARY") {
      const wantsConfirm = lower === "confirm" || lower.includes("confirm") || YES_KEYWORDS.includes(lower);
      const wantsEdit = NO_KEYWORDS.includes(lower) || lower.includes("edit") || lower.includes("change");

      if (wantsEdit) {
        resetProductFlowData(user);
        await delay(500);
        await sendMessage(buildProductSelectionMessage(automation));
        user.step = "PRODUCTS_MENU";
        return;
      }

      if (!wantsConfirm) {
        await sendMessage("Please type *CONFIRM* to continue, or type *NO* to choose another product.");
        return;
      }

      await delay(500);
      await sendMessage("Payment Method:\n1️⃣ Cash on Delivery\n2️⃣ Pay Now");
      user.step = "PRODUCT_PAYMENT_METHOD";
      return;
    }

    /* ===============================
       STEP 11: PAYMENT METHOD
       =============================== */
    if (user.step === "PRODUCT_PAYMENT_METHOD") {
      const paymentNumber = extractNumber(lower);
      const wantsCod =
        paymentNumber === "1" ||
        textHasAny(lower, ["cod", "cash on delivery", "cash delivery", "cash"]);
      const wantsPayNow =
        paymentNumber === "2" ||
        textHasAny(lower, ["pay now", "online", "upi", "gpay", "phonepe", "card"]);

      if (!wantsCod && !wantsPayNow) {
        await sendMessage("Please choose payment method:\n1️⃣ Cash on Delivery\n2️⃣ Pay Now");
        return;
      }

      if (wantsPayNow) {
        await delay(500);
        if (PAYMENT_LINK) {
          await sendMessage(
            `Please complete payment using this secure link 👇\n${PAYMENT_LINK}\n\nReply *DONE* after payment.`
          );
        } else {
          await sendMessage("Please complete payment and reply *DONE* after payment.");
        }
        user.step = "PRODUCT_PAYMENT_CONFIRM";
        return;
      }

      const createdOrder = await createWhatsAppOrder({
        user,
        adminId: assignedAdminId,
        fallbackPhone: phone,
        paymentMethod: "cod",
        paymentStatus: "pending",
      });
      const orderRef = createdOrder?.order_number || `#${createdOrder?.id || "N/A"}`;
      const qty = Number(user.data.productQuantity || 1);
      const productName = user.data.selectedProduct?.label || user.data.productType || "Product";
      const packLabel = user.data.selectedProduct?.packLabel
        ? ` x ${user.data.selectedProduct.packLabel}`
        : "";

      await sendMessage(
        `🎉 Your order is confirmed!\n\nOrder ID: ${orderRef}\nProduct: ${productName}\nQuantity: ${qty}${packLabel}\nExpected Delivery: 3–5 days\n\nWe'll send updates here on WhatsApp.\nNeed help? Type SUPPORT.`
      );
      await delay(400);
      await sendMessage(
        `📦 Shipping Update\nYour order ${orderRef} has been placed and is being prepared.\nType *TRACK ORDER* anytime for latest updates.`
      );
      await delay(400);
      await sendMessage(
        "⭐ Review Request\nHope you loved your order ❤️\nAfter delivery, please rate your experience ⭐⭐⭐⭐⭐"
      );
      resetProductFlowData(user);
      user.step = "MENU";
      return;
    }

    /* ===============================
       STEP 12: PAYMENT VERIFICATION
       =============================== */
    if (user.step === "PRODUCT_PAYMENT_CONFIRM") {
      const paymentDone = lower.includes("done") || lower.includes("paid") || lower.includes("completed");
      if (!paymentDone) {
        await sendMessage("Reply *DONE* once payment is completed.");
        return;
      }

      await delay(500);
      await sendMessage("Thanks 🙌\nWe are verifying your payment.");

      const createdOrder = await createWhatsAppOrder({
        user,
        adminId: assignedAdminId,
        fallbackPhone: phone,
        paymentMethod: "online",
        paymentStatus: "paid",
      });
      const orderRef = createdOrder?.order_number || `#${createdOrder?.id || "N/A"}`;
      const qty = Number(user.data.productQuantity || 1);
      const productName = user.data.selectedProduct?.label || user.data.productType || "Product";
      const packLabel = user.data.selectedProduct?.packLabel
        ? ` x ${user.data.selectedProduct.packLabel}`
        : "";

      await delay(400);
      await sendMessage(
        `🎉 Your order is confirmed!\n\nOrder ID: ${orderRef}\nProduct: ${productName}\nQuantity: ${qty}${packLabel}\nExpected Delivery: 3–5 days\n\nWe'll send updates here on WhatsApp.\nNeed help? Type SUPPORT.`
      );
      await delay(400);
      await sendMessage(
        `📦 Shipping Update\nYour order ${orderRef} has been placed and is being prepared.\nType *TRACK ORDER* anytime for latest updates.`
      );
      await delay(400);
      await sendMessage(
        "⭐ Review Request\nHope you loved your order ❤️\nAfter delivery, please rate your experience ⭐⭐⭐⭐⭐"
      );
      resetProductFlowData(user);
      user.step = "MENU";
      return;
    }

    /* ===============================
       STEP 13: EXECUTIVE MESSAGE
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
  try {
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
          AND COALESCE(c.automation_disabled, FALSE) = FALSE
        ORDER BY mi.created_at ASC
        LIMIT ?
      `,
      [adminId, windowInterval, adminId, RECOVERY_BATCH_LIMIT]
    );
    return rows || [];
  } catch (error) {
    if (!isMissingColumnError(error)) {
      throw error;
    }
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
}

async function recoverPendingMessages(session) {
  const adminId = session?.adminId;
  if (!Number.isFinite(adminId)) return;
  if (!session?.state?.isReady) return;

  const adminProfile = await getAdminAutomationProfile(adminId);
  if (adminProfile?.automation_enabled === false) {
    return;
  }
  const aiSettings = await getAdminAISettings(adminId);
  const businessType = normalizeBusinessType(adminProfile?.business_type);
  if (!aiSettings?.ai_enabled && !ALLOWED_AUTOMATION_BUSINESS_TYPES.has(businessType)) {
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
