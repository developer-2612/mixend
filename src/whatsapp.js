import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import qrImage from "qrcode";
import { EventEmitter } from "node:events";
import { db } from "./db.js";

const { Client, LocalAuth } = pkg;
export const whatsappEvents = new EventEmitter();

/* ===============================
   MULTI-ADMIN WHATSAPP SESSIONS
   =============================== */
const sessions = new Map();

const createClient = (adminId) =>
  new Client({
    authStrategy: new LocalAuth({
      clientId: `admin-${adminId}`,
      dataPath: ".wwebjs_auth",
    }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
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
    `UPDATE admin_accounts
     SET whatsapp_number = ?, whatsapp_name = ?, whatsapp_connected_at = NOW()
     WHERE id = ?`,
    [session.state.activeAdminNumber, session.state.activeAdminName, session.adminId]
  );
};

const emitStatus = (session, nextStatus) => {
  session.state.status = nextStatus;
  whatsappEvents.emit("status", {
    adminId: session.adminId,
    ...buildStateResponse(session),
  });
};

const emitQr = (session, qrImageValue) => {
  whatsappEvents.emit("qr", { adminId: session.adminId, qrImage: qrImageValue });
};

const attachClientEvents = (session) => {
  const { client } = session;

  client.on("qr", async (qr) => {
    emitStatus(session, "qr");
    session.state.isReady = false;
    console.log(`📱 Scan the QR code (admin ${session.adminId})`);
    qrcode.generate(qr, { small: true });
    try {
      session.state.latestQrImage = await qrImage.toDataURL(qr);
      emitQr(session, session.state.latestQrImage);
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
  const session = sessions.get(adminId) || createSession(adminId);

  if (session.state.hasStarted) {
    return { ...buildStateResponse(session), alreadyStarted: true };
  }

  session.state.hasStarted = true;
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
const MAIN_MENU_TEXT = [
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
].join("\n");

const returningMenuText = (name) =>
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
  ].join("\n");

const SERVICES_MENU_TEXT = [
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
].join("\n");

const PRODUCTS_MENU_TEXT = [
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
].join("\n");

const PRODUCT_DETAILS_PROMPT =
  "Great choice 👍\nPlease share product details (stone name, carat/size, ring/pendant, purpose).\nPrices vary by quality/weight; we will share the best current estimate after details.";

const TWO_MINUTES_MS = 2 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const SERVICE_OPTIONS = [
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
];

const PRODUCT_OPTIONS = [
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
];

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

const detectMainIntent = (input) => {
  const execKeywords = ["executive", "agent", "human", "call", "talk", "support", "baat"];
  const serviceKeywords = [
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
  ];
  const productKeywords = [
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
  ];

  if (textHasAny(input, execKeywords)) return "EXECUTIVE";

  const wantsService = textHasAny(input, serviceKeywords);
  const wantsProduct = textHasAny(input, productKeywords);

  if (wantsService && !wantsProduct) return "SERVICES";
  if (wantsProduct && !wantsService) return "PRODUCTS";

  if (wantsService && wantsProduct) {
    if (textHasAny(input, ["buy", "order", "price", "cost", "ring", "pendant"])) {
      return "PRODUCTS";
    }
    if (textHasAny(input, ["consult", "recommend", "suggest", "upay", "solution"])) {
      return "SERVICES";
    }
  }
  return null;
};

const isMenuCommand = (input, rawText) => {
  if (["menu", "main menu", "start", "restart", "home", "back"].includes(input)) return true;
  return rawText.includes("मेनू") || rawText.includes("मुख्य मेनू");
};

const buildRequirementSummary = ({ user, phone }) => {
  const lines = [];
  const displayName = user.name || user.data.name || "N/A";
  const email = user.email || user.data.email || "N/A";

  lines.push(`Name: ${displayName}`);
  lines.push(`Phone: ${phone}`);
  lines.push(`Email: ${email}`);

  if (user.data.reason) lines.push(`Request Type: ${user.data.reason}`);
  if (user.data.serviceType) lines.push(`Service: ${user.data.serviceType}`);
  if (user.data.productType) lines.push(`Product: ${user.data.productType}`);
  if (user.data.serviceDetails) lines.push(`Service Details: ${user.data.serviceDetails}`);
  if (user.data.productDetails) lines.push(`Product Details: ${user.data.productDetails}`);
  if (user.data.address) lines.push(`Address: ${user.data.address}`);
  if (user.data.altContact) lines.push(`Alt Contact: ${user.data.altContact}`);
  if (user.data.executiveMessage) lines.push(`Message: ${user.data.executiveMessage}`);
  if (user.data.lastUserMessage) lines.push(`Last User Message: ${user.data.lastUserMessage}`);

  return lines.join("\n");
};

const promptForName = async ({ user, from, client }) => {
  await delay(1000);
  await client.sendMessage(from, "May I know your *name*?");
  user.step = "ASK_NAME";
};

const promptForEmail = async ({ user, from, client }) => {
  await delay(1000);
  await client.sendMessage(from, "Could you please share your *email address*?");
  user.step = "ASK_EMAIL";
};

const maybeFinalizeLead = async ({
  user,
  from,
  phone,
  assignedAdminId,
  client,
  users,
}) => {
  const hasName = Boolean(user.name || user.data.name);
  const hasEmail = Boolean(user.email || user.data.email);

  if (!hasName) {
    user.data.pendingFinalize = true;
    await promptForName({ user, from, client });
    return;
  }

  if (!hasEmail) {
    user.data.pendingFinalize = true;
    await promptForEmail({ user, from, client });
    return;
  }

  user.data.message = buildRequirementSummary({ user, phone });
  await finalizeLead({ user, from, phone, assignedAdminId, client, users });
};

const savePartialLead = async ({ user, phone, assignedAdminId }) => {
  const adminId = user.assignedAdminId || assignedAdminId;
  if (!user.clientId) return;

  const summary = buildRequirementSummary({ user, phone });
  const category = user.data.reason ? `Partial - ${user.data.reason}` : "Partial";

  await db.query(
    `INSERT INTO messages (user_id, admin_id, message_text, message_type, status)
     VALUES (?, ?, ?, 'incoming', 'delivered')`,
    [user.clientId, adminId, summary]
  );

  await db.query(
    `INSERT INTO user_requirements (user_id, requirement_text, category, status)
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

const sendResumePrompt = async ({ user, from, client }) => {
  switch (user.step) {
    case "SERVICES_MENU":
      await client.sendMessage(from, SERVICES_MENU_TEXT);
      return;
    case "PRODUCTS_MENU":
      await client.sendMessage(from, PRODUCTS_MENU_TEXT);
      return;
    case "SERVICE_DETAILS": {
      const serviceOption = SERVICE_OPTIONS.find(
        (option) => option.label === user.data.serviceType
      );
      await client.sendMessage(
        from,
        serviceOption?.prompt ||
          "Please share your service details (DOB, time, place, and concern)."
      );
      return;
    }
    case "PRODUCT_REQUIREMENTS":
      await client.sendMessage(from, PRODUCT_DETAILS_PROMPT);
      return;
    case "PRODUCT_ADDRESS":
      await client.sendMessage(
        from,
        "Please share your *full delivery address with pin code* (पूरा पता + पिन कोड)."
      );
      return;
    case "PRODUCT_ALT_CONTACT":
      await client.sendMessage(
        from,
        "Alternate contact number (optional). If none, reply *NA*."
      );
      return;
    case "EXECUTIVE_MESSAGE":
      await client.sendMessage(
        from,
        "Sure 👍\nPlease tell us briefly *how we can help you today*."
      );
      return;
    case "ASK_NAME":
      await client.sendMessage(from, "May I know your *name*?");
      return;
    case "ASK_EMAIL":
      await client.sendMessage(from, "Could you please share your *email address*?");
      return;
    case "MENU":
      await client.sendMessage(
        from,
        user.isReturningUser && user.name ? returningMenuText(user.name) : MAIN_MENU_TEXT
      );
      return;
    default:
      await client.sendMessage(from, MAIN_MENU_TEXT);
  }
};

const finalizeLead = async ({
  user,
  from,
  phone,
  assignedAdminId,
  client,
  users,
}) => {
  let clientId = user.clientId;
  const adminId = user.assignedAdminId || assignedAdminId;
  const displayName = user.name || user.data.name || "Unknown";
  const email = user.email || user.data.email || null;

  if (!clientId) {
    const [result] = await db.query(
      "INSERT INTO users (name, phone, email, assigned_admin_id) VALUES (?, ?, ?, ?)",
      [displayName, phone, email, adminId]
    );
    clientId = result.insertId;
  }
  if (clientId) {
    await db.query(
      "UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?",
      [displayName !== "Unknown" ? displayName : null, email, clientId]
    );
  }

  const requirementText = user.data.message || buildRequirementSummary({ user, phone });
  const requirementCategory =
    user.data.serviceType || user.data.productType || user.data.reason || "General";

  await db.query(
    `INSERT INTO messages (user_id, admin_id, message_text, message_type, status)
     VALUES (?, ?, ?, 'incoming', 'delivered')`,
    [clientId, adminId, requirementText]
  );

  await db.query(
    `INSERT INTO user_requirements (user_id, requirement_text, category, status)
     VALUES (?, ?, ?, 'pending')`,
    [clientId, requirementText, requirementCategory]
  );

  console.log(
    user.isReturningUser
      ? `🔁 Message saved for returning user: ${displayName}`
      : "🆕 New lead saved"
  );

  await delay(1000);
  await client.sendMessage(
    from,
    `Thank you ${displayName} 😊\nOur team will contact you shortly.`
  );

  if (user.idleTimer) {
    clearTimeout(user.idleTimer);
  }
  user.finalized = true;
  if (users?.[from]) {
    delete users[from];
  }
};

function attachAutomationHandlers(session) {
  const { client } = session;
  const users = session.users;

  /* ===============================
     🔥 AUTOMATION LOGIC
     =============================== */
  client.on("message", async (message) => {
    try {
      if (!session.state.isReady) return;
      if (!message || message.fromMe) return;

    const from = message.from;
    if (!from || from.endsWith("@g.us")) return;

    const text = message.body?.trim();
    if (!text) return;

    const lower = text.toLowerCase();
    const phone = from.replace("@c.us", "");

    /* ===============================
       🔍 CHECK USER IN DB
       =============================== */
    const activeAdminId = session.adminId;
    if (!activeAdminId) {
      console.warn("⚠️ Incoming message ignored because no admin is connected.");
      return;
    }

    const [rows] = await db.query(
      "SELECT id, name, email, assigned_admin_id FROM users WHERE phone = ?",
      [phone]
    );

    let isReturningUser = rows.length > 0;
    let existingUser = isReturningUser ? rows[0] : null;
    let assignedAdminId = existingUser?.assigned_admin_id || activeAdminId;
    if (existingUser && existingUser.assigned_admin_id !== activeAdminId) {
      assignedAdminId = activeAdminId;
      await db.query(
        "UPDATE users SET assigned_admin_id = ? WHERE id = ?",
        [activeAdminId, existingUser.id]
      );
    }

    if (!isReturningUser) {
      try {
        const [result] = await db.query(
          "INSERT INTO users (phone, assigned_admin_id) VALUES (?, ?)",
          [phone, assignedAdminId]
        );
        existingUser = {
          id: result.insertId,
          name: null,
          email: null,
          assigned_admin_id: assignedAdminId,
        };
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
          const [freshRows] = await db.query(
            "SELECT id, name, email, assigned_admin_id FROM users WHERE phone = ?",
            [phone]
          );
          if (freshRows.length > 0) {
            existingUser = freshRows[0];
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
    if (!users[from]) {
      users[from] = {
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

    const user = users[from];

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
      await client.sendMessage(
        from,
        `${nameLine}Do you want to continue the last conversation or start again?\n1️⃣ Continue\n2️⃣ Start again`
      );
      if (user.name) {
        user.greetedThisSession = true;
      }
      user.lastUserMessageAt = now;
      user.data.lastUserMessage = text;
      user.partialSavedAt = null;
      scheduleIdleSave({ user, phone, assignedAdminId });
      return;
    }

    if (user.isReturningUser && user.name && !user.greetedThisSession) {
      await delay(500);
      await client.sendMessage(from, `Nice to hear from you, ${user.name} 😊`);
      user.greetedThisSession = true;
    }

    user.lastUserMessageAt = now;
    user.data.lastUserMessage = text;
    user.partialSavedAt = null;
    scheduleIdleSave({ user, phone, assignedAdminId });

    if (isMenuCommand(lower, text)) {
      await delay(1000);
      await client.sendMessage(
        from,
        user.isReturningUser && user.name ? returningMenuText(user.name) : MAIN_MENU_TEXT
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
        await client.sendMessage(
          from,
          "Please reply with 1 to continue or 2 to start again."
        );
        return;
      }

      if (wantsRestart) {
        user.data = {};
        user.resumeStep = null;
        user.awaitingResumeDecision = false;
        user.step = "START";
        await delay(1000);
        await client.sendMessage(from, MAIN_MENU_TEXT);
        user.step = "MENU";
        return;
      }

      user.step = user.resumeStep || "MENU";
      user.resumeStep = null;
      user.awaitingResumeDecision = false;
      await delay(1000);
      await sendResumePrompt({ user, from, client });
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
        : detectMainIntent(lower);
      const matchedService = ["1", "2", "3"].includes(startNumber)
        ? null
        : matchOption(lower, SERVICE_OPTIONS);
      const matchedProduct = ["1", "2", "3"].includes(startNumber)
        ? null
        : matchOption(lower, PRODUCT_OPTIONS);
      const resolvedIntent =
        mainIntent || (matchedService ? "SERVICES" : matchedProduct ? "PRODUCTS" : null);

      await delay(1000);
      if (resolvedIntent === "SERVICES") {
        user.data.reason = "Services";
        if (matchedService && matchedService.id === "executive") {
          await client.sendMessage(
            from,
            "Sure 👍\nPlease tell us briefly *how we can help you today*."
          );
          user.step = "EXECUTIVE_MESSAGE";
          return;
        }
        if (matchedService && matchedService.id !== "main_menu" && matchedService.prompt) {
          user.data.serviceType = matchedService.label;
          await client.sendMessage(from, matchedService.prompt);
          user.step = "SERVICE_DETAILS";
          return;
        }
        await client.sendMessage(from, SERVICES_MENU_TEXT);
        user.step = "SERVICES_MENU";
        return;
      }
      if (resolvedIntent === "PRODUCTS") {
        user.data.reason = "Products";
        if (matchedProduct && matchedProduct.id !== "main_menu") {
          user.data.productType = matchedProduct.label;
          await client.sendMessage(from, PRODUCT_DETAILS_PROMPT);
          user.step = "PRODUCT_REQUIREMENTS";
          return;
        }
        await client.sendMessage(from, PRODUCTS_MENU_TEXT);
        user.step = "PRODUCTS_MENU";
        return;
      }
      if (resolvedIntent === "EXECUTIVE") {
        user.data.reason = "Talk to an Executive";
        await client.sendMessage(
          from,
          "Sure 👍\nPlease tell us briefly *how we can help you today*."
        );
        user.step = "EXECUTIVE_MESSAGE";
        return;
      }

      await client.sendMessage(from, MAIN_MENU_TEXT);
      user.step = "MENU";
      return;
    }

    /* ===============================
       STEP 1B: START (RETURNING USER)
       =============================== */
    if (user.step === "MENU" && user.isReturningUser && (lower === "hi" || lower === "hello")) {
      await delay(1000);
      await client.sendMessage(from, returningMenuText(user.name));
      return;
    }

    /* ===============================
       STEP 2: MENU
       =============================== */
    if (user.step === "MENU") {
      const number = extractNumber(lower);
      const isNumericMenuChoice = ["1", "2", "3"].includes(number);
      const mainIntent = detectMainIntent(lower);
      const matchedService = isNumericMenuChoice ? null : matchOption(lower, SERVICE_OPTIONS);
      const matchedProduct = isNumericMenuChoice ? null : matchOption(lower, PRODUCT_OPTIONS);

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
        await client.sendMessage(
          from,
          "Please reply with 1, 2, or 3, or type your need 🙂"
        );
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
        await client.sendMessage(
          from,
          "Sure 👍\nPlease tell us briefly *how we can help you today*."
        );
        user.step = "EXECUTIVE_MESSAGE";
        return;
      }
      if (mainChoice === "SERVICES" && matchedService && matchedService.id !== "main_menu") {
        user.data.serviceType = matchedService.label;
        await client.sendMessage(
          from,
          matchedService.prompt ||
            "Please share your service details (DOB, time, place, and concern)."
        );
        user.step = "SERVICE_DETAILS";
        return;
      }
      if (mainChoice === "PRODUCTS" && matchedProduct && matchedProduct.id !== "main_menu") {
        user.data.productType = matchedProduct.label;
        await client.sendMessage(from, PRODUCT_DETAILS_PROMPT);
        user.step = "PRODUCT_REQUIREMENTS";
        return;
      }
      if (mainChoice === "SERVICES") {
        await client.sendMessage(from, SERVICES_MENU_TEXT);
        user.step = "SERVICES_MENU";
        return;
      }
      if (mainChoice === "PRODUCTS") {
        await client.sendMessage(from, PRODUCTS_MENU_TEXT);
        user.step = "PRODUCTS_MENU";
        return;
      }
      await client.sendMessage(
        from,
        "Sure 👍\nPlease tell us briefly *how we can help you today*."
      );
      user.step = "EXECUTIVE_MESSAGE";
      return;
    }

    /* ===============================
       STEP 3: NAME
       =============================== */
    if (user.step === "ASK_NAME") {
      user.data.name = text;
      user.name = text;

      await maybeFinalizeLead({
        user,
        from,
        phone,
        assignedAdminId,
        client,
        users,
      });
      return;
    }

    /* ===============================
       STEP 4: EMAIL
       =============================== */
    if (user.step === "ASK_EMAIL") {
      user.data.email = text;
      user.email = text;

      await maybeFinalizeLead({
        user,
        from,
        phone,
        assignedAdminId,
        client,
        users,
      });
      return;
    }

    /* ===============================
       STEP 4B: SERVICES MENU
       =============================== */
    if (user.step === "SERVICES_MENU") {
      const selectedService = matchOption(lower, SERVICE_OPTIONS);
      if (!selectedService) {
        await client.sendMessage(from, "Please choose a service from the menu 🙂");
        return;
      }

      if (selectedService.id === "main_menu") {
        await delay(1000);
        await client.sendMessage(from, MAIN_MENU_TEXT);
        user.step = "MENU";
        return;
      }

      if (selectedService.id === "executive") {
        user.data.reason = "Talk to an Executive";
        await delay(1000);
        await client.sendMessage(
          from,
          "Sure 👍\nPlease tell us briefly *how we can help you today*."
        );
        user.step = "EXECUTIVE_MESSAGE";
        return;
      }

      user.data.reason = "Services";
      user.data.serviceType = selectedService.label;

      await delay(1000);
      await client.sendMessage(from, selectedService.prompt);
      user.step = "SERVICE_DETAILS";
      return;
    }

    /* ===============================
       STEP 4C: PRODUCTS MENU
       =============================== */
    if (user.step === "PRODUCTS_MENU") {
      const selectedProduct = matchOption(lower, PRODUCT_OPTIONS);
      if (!selectedProduct) {
        await client.sendMessage(from, "Please choose a product from the menu 🙂");
        return;
      }

      if (selectedProduct.id === "main_menu") {
        await delay(1000);
        await client.sendMessage(from, MAIN_MENU_TEXT);
        user.step = "MENU";
        return;
      }

      user.data.reason = "Products";
      user.data.productType = selectedProduct.label;

      await delay(1000);
      await client.sendMessage(from, PRODUCT_DETAILS_PROMPT);
      user.step = "PRODUCT_REQUIREMENTS";
      return;
    }

    /* ===============================
       STEP 5: SERVICE DETAILS
       =============================== */
    if (user.step === "SERVICE_DETAILS") {
      user.data.serviceDetails = text;
      user.data.message = buildRequirementSummary({ user, phone });

      await maybeFinalizeLead({
        user,
        from,
        phone,
        assignedAdminId,
        client,
        users,
      });
      return;
    }

    /* ===============================
       STEP 6: PRODUCT REQUIREMENTS
       =============================== */
    if (user.step === "PRODUCT_REQUIREMENTS") {
      user.data.productDetails = text;

      await delay(1000);
      await client.sendMessage(
        from,
        "Please share your *full delivery address with pin code* (पूरा पता + पिन कोड)."
      );
      user.step = "PRODUCT_ADDRESS";
      return;
    }

    /* ===============================
       STEP 7: PRODUCT ADDRESS
       =============================== */
    if (user.step === "PRODUCT_ADDRESS") {
      user.data.address = text;

      await delay(1000);
      await client.sendMessage(
        from,
        "Alternate contact number (optional). If none, reply *NA*."
      );
      user.step = "PRODUCT_ALT_CONTACT";
      return;
    }

    /* ===============================
       STEP 8: PRODUCT ALT CONTACT
       =============================== */
    if (user.step === "PRODUCT_ALT_CONTACT") {
      user.data.altContact = text;
      user.data.message = buildRequirementSummary({ user, phone });

      await maybeFinalizeLead({
        user,
        from,
        phone,
        assignedAdminId,
        client,
        users,
      });
      return;
    }

    /* ===============================
       STEP 9: EXECUTIVE MESSAGE
       =============================== */
    if (user.step === "EXECUTIVE_MESSAGE") {
      user.data.executiveMessage = text;
      user.data.message = buildRequirementSummary({ user, phone });

      await maybeFinalizeLead({
        user,
        from,
        phone,
        assignedAdminId,
        client,
        users,
      });
      return;
    }
  } catch (err) {
      console.error("❌ Automation error:", err);
    }
  });
}

/* ===============================
   INIT
   =============================== */
// Start the client via startWhatsApp() from the server.
