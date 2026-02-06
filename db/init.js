import './load-env.js';
import pg from "pg";
import nodemailer from "nodemailer";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../lib/auth.js";

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

const DEFAULT_SUPER_ADMIN = {
  name: "Rishab Khanna",
  phone: "8708767499",
  email: "rishabkhanna26@gmail.com",
};

const SMTP_EMAIL = process.env.SMTP_EMAIL || "";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "";

function generatePassword() {
  return randomBytes(10).toString("hex");
}

async function sendPasswordEmail(to, password) {
  if (!SMTP_EMAIL || !SMTP_PASSWORD) {
    console.warn("⚠️ SMTP_EMAIL or SMTP_PASSWORD not set. Skipping password email.");
    return false;
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SMTP_EMAIL,
      pass: SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: SMTP_EMAIL,
    to,
    subject: "Your AlgoAura Super Admin Account",
    text: `Your super admin account has been created.\n\nEmail: ${to}\nTemporary Password: ${password}\n\nPlease log in and change your password.`,
  });
  return true;
}

async function ensureDefaultSuperAdmin(client) {
  const { rows: existingSuper } = await client.query(
    `SELECT id FROM admin_accounts WHERE admin_tier = 'super_admin' LIMIT 1`
  );

  if (existingSuper.length > 0) {
    return;
  }

  const { rows: existing } = await client.query(
    `SELECT id, password_hash, admin_tier FROM admin_accounts WHERE email = $1 OR phone = $2 LIMIT 1`,
    [DEFAULT_SUPER_ADMIN.email, DEFAULT_SUPER_ADMIN.phone]
  );

  let passwordToSend = null;
  if (existing.length > 0) {
    const record = existing[0];
    const updates = [];
    const values = [];

    if (record.admin_tier !== "super_admin") {
      updates.push("admin_tier = 'super_admin'");
    }

    if (!record.password_hash) {
      const plainPassword = generatePassword();
      passwordToSend = plainPassword;
      updates.push("password_hash = $1");
      values.push(hashPassword(plainPassword));
    }

    if (updates.length > 0) {
      values.push(record.id);
      await client.query(
        `UPDATE admin_accounts SET ${updates.join(", ")} WHERE id = $${values.length}`,
        values
      );
    }
  } else {
    const plainPassword = generatePassword();
    passwordToSend = plainPassword;
    await client.query(
      `INSERT INTO admin_accounts (name, phone, email, password_hash, admin_tier, status)
       VALUES ($1, $2, $3, $4, 'super_admin', 'active')`,
      [
        DEFAULT_SUPER_ADMIN.name,
        DEFAULT_SUPER_ADMIN.phone,
        DEFAULT_SUPER_ADMIN.email,
        hashPassword(plainPassword),
      ]
    );
  }

  if (passwordToSend) {
    try {
      const sent = await sendPasswordEmail(DEFAULT_SUPER_ADMIN.email, passwordToSend);
      if (sent) {
        console.log("✅ Super admin password emailed.");
      } else {
        console.warn("⚠️ Email not sent. Temporary super admin password:", passwordToSend);
      }
    } catch (err) {
      console.error("❌ Failed to send super admin email:", err.message);
      console.warn("⚠️ Temporary super admin password:", passwordToSend);
    }
  } else {
    console.log("✅ Super admin already existed with a password.");
  }
}

async function ensureAdminWhatsappColumns(client) {
  const columns = [
    { name: "whatsapp_number", sql: "ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20)" },
    { name: "whatsapp_name", sql: "ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS whatsapp_name VARCHAR(100)" },
    { name: "whatsapp_connected_at", sql: "ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS whatsapp_connected_at TIMESTAMPTZ" },
  ];

  for (const column of columns) {
    await client.query(column.sql);
  }
}

export async function initDatabase() {
  try {
    if (!DATABASE_URL) {
      throw new Error("DATABASE_URL is required for Supabase/Postgres");
    }

    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log("✅ Postgres connected");

    const tableQueries = [
      `
      CREATE TABLE IF NOT EXISTS admin_accounts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(150) UNIQUE,
        password_hash TEXT,
        admin_tier VARCHAR(20) DEFAULT 'client_admin' CHECK (admin_tier IN ('super_admin', 'client_admin')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        parent_admin_id INT REFERENCES admin_accounts(id),
        last_login TIMESTAMPTZ,
        whatsapp_number VARCHAR(20),
        whatsapp_name VARCHAR(100),
        whatsapp_connected_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS admin_accounts_admin_tier_idx ON admin_accounts (admin_tier)`,
      `CREATE INDEX IF NOT EXISTS admin_accounts_phone_idx ON admin_accounts (phone)`,

      `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100),
        email VARCHAR(150),
        assigned_admin_id INT NOT NULL REFERENCES admin_accounts(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS users_phone_idx ON users (phone)`,
      `CREATE INDEX IF NOT EXISTS users_assigned_admin_idx ON users (assigned_admin_id)`,

      `
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        admin_id INT NOT NULL REFERENCES admin_accounts(id),
        message_text TEXT NOT NULL,
        message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('incoming', 'outgoing')),
        status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS messages_user_created_idx ON messages (user_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS messages_admin_created_idx ON messages (admin_id, created_at)`,

      `
      CREATE TABLE IF NOT EXISTS user_requirements (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        requirement_text TEXT NOT NULL,
        category VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS user_requirements_user_status_idx ON user_requirements (user_id, status)`,

      `
      CREATE TABLE IF NOT EXISTS user_needs (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        need_text TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'completed')),
        assigned_to INT REFERENCES admin_accounts(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS user_needs_user_status_idx ON user_needs (user_id, status)`,

      `
      CREATE TABLE IF NOT EXISTS broadcasts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        message TEXT NOT NULL,
        target_audience_type VARCHAR(50) DEFAULT 'all',
        scheduled_at TIMESTAMPTZ,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
        sent_count INT DEFAULT 0,
        delivered_count INT DEFAULT 0,
        created_by INT REFERENCES admin_accounts(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS broadcasts_status_idx ON broadcasts (status)`,
      `CREATE INDEX IF NOT EXISTS broadcasts_created_by_idx ON broadcasts (created_by)`,

      `
      CREATE TABLE IF NOT EXISTS message_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        category VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        variables_json TEXT,
        created_by INT REFERENCES admin_accounts(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS message_templates_category_idx ON message_templates (category)`,
      `CREATE INDEX IF NOT EXISTS message_templates_created_by_idx ON message_templates (created_by)`,
    ];

    for (const sql of tableQueries) {
      await client.query(sql);
    }

    await ensureAdminWhatsappColumns(client);
    await ensureDefaultSuperAdmin(client);

    console.log("✅ Database ready and verified");
    await client.end();
  } catch (err) {
    console.error("❌ Database init failed:", err.message);
    process.exit(1);
  }
}
