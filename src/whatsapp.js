import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import qrImage from "qrcode";
import { EventEmitter } from "node:events";
import { db } from "./db.js";

const { Client, LocalAuth } = pkg;
export const whatsappEvents = new EventEmitter();

/* ===============================
   CLIENT SETUP
   =============================== */
export const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});


let isReady = false;
let hasStarted = false;
let status = "idle";
let latestQrImage = null;

const emitStatus = (nextStatus) => {
  status = nextStatus;
  whatsappEvents.emit("status", status);
};

/* ===============================
   QR & READY EVENTS
   =============================== */
client.on("qr", async (qr) => {
  emitStatus("qr");
  isReady = false;
  console.log("📱 Scan the QR code");
  qrcode.generate(qr, { small: true });
  try {
    latestQrImage = await qrImage.toDataURL(qr);
    whatsappEvents.emit("qr", latestQrImage);
  } catch (err) {
    console.error("❌ QR generation failed:", err);
  }
});

client.on("ready", () => {
  isReady = true;
  latestQrImage = null;
  emitStatus("connected");
  console.log("✅ WhatsApp Ready");
});

client.on("disconnected", () => {
  isReady = false;
  emitStatus("disconnected");
  console.log("⚠️ WhatsApp disconnected");
});

client.on("auth_failure", () => {
  isReady = false;
  emitStatus("auth_failure");
  console.log("❌ WhatsApp auth failure");
});

export const startWhatsApp = async () => {
  if (hasStarted) {
    return { status, alreadyStarted: true };
  }

  hasStarted = true;
  emitStatus("starting");
  try {
    await client.initialize();
    return { status, alreadyStarted: false };
  } catch (err) {
    hasStarted = false;
    emitStatus("error");
    throw err;
  }
};

export const stopWhatsApp = async () => {
  if (!hasStarted) {
    return { status, alreadyStarted: false };
  }

  try {
    await client.destroy();
  } finally {
    hasStarted = false;
    isReady = false;
    latestQrImage = null;
    emitStatus("disconnected");
  }
  return { status, alreadyStarted: true };
};

export const getWhatsAppState = () => ({
  status,
  ready: isReady,
  qrImage: latestQrImage,
});

/* ===============================
   🧠 USER MEMORY
   =============================== */
const users = Object.create(null);
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const getDefaultAdminId = async () => {
  const [rows] = await db.query(
    `SELECT id
     FROM admin_accounts
     WHERE status = 'active'
     ORDER BY (admin_tier = 'super_admin') DESC, created_at ASC
     LIMIT 1`
  );
  return rows[0]?.id || null;
};

/* ===============================
   🔥 AUTOMATION LOGIC
   =============================== */
client.on("message", async (message) => {
  try {
    if (!isReady) return;
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
    const [rows] = await db.query(
      "SELECT id, name, email, assigned_admin_id FROM users WHERE phone = ?",
      [phone]
    );

    const isReturningUser = rows.length > 0;
    const existingUser = isReturningUser ? rows[0] : null;
    const assignedAdminId = existingUser?.assigned_admin_id || (await getDefaultAdminId());

    /* ===============================
       INIT USER SESSION
       =============================== */
    if (!users[from]) {
      users[from] = {
        step: isReturningUser ? "MENU" : "START",
        data: {},
        isReturningUser,
        clientId: isReturningUser ? existingUser.id : null,
        name: isReturningUser ? existingUser.name : null,
        assignedAdminId,
      };
    }

    const user = users[from];

    /* ===============================
       STEP 1: START (NEW USER)
       =============================== */
    if (user.step === "START") {
      if (lower === "hi" || lower === "hello") {
        await delay(1000);
        await client.sendMessage(
          from,
          [
            "Hi 👋",
            "I am a helper bot for *ABC Company*.",
            "",
            "How can I help you today?",
            "",
            "1️⃣ Services",
            "2️⃣ Products",
            "3️⃣ Talk to an Executive",
            "",
            "_Reply with 1, 2, or 3_",
          ].join("\n")
        );
        user.step = "MENU";
      }
      return;
    }

    /* ===============================
       STEP 1B: START (RETURNING USER)
       =============================== */
    if (user.step === "MENU" && user.isReturningUser && (lower === "hi" || lower === "hello")) {
      await delay(1000);
      await client.sendMessage(
        from,
        [
          `Welcome back ${user.name} 👋`,
          "",
          "How can we help you today?",
          "",
          "1️⃣ Services",
          "2️⃣ Products",
          "3️⃣ Talk to an Executive",
          "",
          "_Reply with 1, 2, or 3_",
        ].join("\n")
      );
      return;
    }

    /* ===============================
       STEP 2: MENU
       =============================== */
    if (user.step === "MENU") {
      if (!["1", "2", "3"].includes(lower)) {
        await client.sendMessage(from, "Please reply with 1, 2, or 3 🙂");
        return;
      }

      user.data.reason =
        lower === "1"
          ? "Services"
          : lower === "2"
          ? "Products"
          : "Talk to an Executive";

      // RETURNING USER → SKIP NAME & EMAIL
      if (user.isReturningUser) {
        await delay(1000);
        await client.sendMessage(
          from,
          "Got it 👍\nPlease tell us briefly *how we can help you today*."
        );
        user.step = "ASK_MESSAGE";
        return;
      }

      // NEW USER → ASK NAME
      await delay(1000);
      await client.sendMessage(from, "Great 😊\nMay I know your *name*?");
      user.step = "ASK_NAME";
      return;
    }

    /* ===============================
       STEP 3: NAME
       =============================== */
    if (user.step === "ASK_NAME") {
      user.data.name = text;

      await delay(1000);
      await client.sendMessage(
        from,
        `Thanks ${text} 🙏\nCould you please share your *email address*?`
      );

      user.step = "ASK_EMAIL";
      return;
    }

    /* ===============================
       STEP 4: EMAIL
       =============================== */
    if (user.step === "ASK_EMAIL") {
      user.data.email = text;

      await delay(1000);
      await client.sendMessage(
        from,
        "Got it 👍\nPlease tell us briefly *how we can help you*."
      );

      user.step = "ASK_MESSAGE";
      return;
    }

    /* ===============================
       STEP 5: FINAL (SAVE MESSAGE)
       =============================== */
    if (user.step === "ASK_MESSAGE") {
      user.data.message = text;

      let clientId = user.clientId;
      let adminId = user.assignedAdminId || assignedAdminId;

      if (!adminId) {
        console.error("❌ No admin account available to assign this user.");
        await client.sendMessage(
          from,
          "We are setting up your account. Please try again later."
        );
        delete users[from];
        return;
      }

      // INSERT CLIENT IF NEW
      if (!user.isReturningUser) {
        const [result] = await db.query(
          "INSERT INTO users (name, phone, email, assigned_admin_id) VALUES (?, ?, ?, ?)",
          [
            user.data.name,
            phone,
            user.data.email,
            adminId,
          ]
        );
        clientId = result.insertId;
      }

      // SAVE MESSAGE
      await db.query(
        `INSERT INTO messages (user_id, admin_id, message_text, message_type, status)
         VALUES (?, ?, ?, 'incoming', 'delivered')`,
        [clientId, adminId, user.data.message]
      );

      await db.query(
        `INSERT INTO user_requirements (user_id, requirement_text, category, status)
         VALUES (?, ?, ?, 'pending')`,
        [clientId, user.data.message, user.data.reason]
      );

      console.log(
        user.isReturningUser
          ? `🔁 Message saved for returning user: ${user.name}`
          : "🆕 New lead saved"
      );

      await delay(1000);
      await client.sendMessage(
        from,
        `Thank you ${user.isReturningUser ? user.name : user.data.name} 😊
Our team will contact you shortly.`
      );

      delete users[from];
    }
  } catch (err) {
    console.error("❌ Automation error:", err);
  }
});

/* ===============================
   INIT
   =============================== */
// Start the client via startWhatsApp() from the server.
