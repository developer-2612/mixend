import fs from "fs";
import path from "path";
import pg from "pg";
import nodemailer from "nodemailer";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../lib/auth.js";

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const root = path.resolve(process.cwd());
parseEnvFile(path.join(root, ".env"));
parseEnvFile(path.join(root, ".env.local"));

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
    `SELECT id FROM admins WHERE admin_tier = 'super_admin' LIMIT 1`
  );

  if (existingSuper.length > 0) {
    return;
  }

  const { rows: existing } = await client.query(
    `SELECT id, password_hash, admin_tier FROM admins WHERE email = $1 OR phone = $2 LIMIT 1`,
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
        `UPDATE admins SET ${updates.join(", ")} WHERE id = $${values.length}`,
        values
      );
    }
  } else {
    const plainPassword = generatePassword();
    passwordToSend = plainPassword;
    await client.query(
      `INSERT INTO admins (name, phone, email, password_hash, admin_tier, status)
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
    { name: "whatsapp_number", sql: "ALTER TABLE admins ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20)" },
    { name: "whatsapp_name", sql: "ALTER TABLE admins ADD COLUMN IF NOT EXISTS whatsapp_name VARCHAR(100)" },
    { name: "whatsapp_connected_at", sql: "ALTER TABLE admins ADD COLUMN IF NOT EXISTS whatsapp_connected_at TIMESTAMPTZ" },
  ];

  for (const column of columns) {
    await client.query(column.sql);
  }
}

async function ensureAdminProfileColumns(client) {
  const columns = [
    {
      name: "profession",
      sql: "ALTER TABLE admins ADD COLUMN IF NOT EXISTS profession VARCHAR(50) DEFAULT 'astrology'",
    },
    {
      name: "profession_request",
      sql: "ALTER TABLE admins ADD COLUMN IF NOT EXISTS profession_request VARCHAR(50)",
    },
    {
      name: "profession_requested_at",
      sql: "ALTER TABLE admins ADD COLUMN IF NOT EXISTS profession_requested_at TIMESTAMPTZ",
    },
  ];

  for (const column of columns) {
    await client.query(column.sql);
  }
}

async function ensureAdminAIColumns(client) {
  const columns = [
    { name: "ai_enabled", sql: "ALTER TABLE admins ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT FALSE" },
    { name: "ai_prompt", sql: "ALTER TABLE admins ADD COLUMN IF NOT EXISTS ai_prompt TEXT" },
    { name: "ai_blocklist", sql: "ALTER TABLE admins ADD COLUMN IF NOT EXISTS ai_blocklist TEXT" },
  ];

  for (const column of columns) {
    await client.query(column.sql);
  }
}

async function ensureAdminPasswordResetColumns(client) {
  const columns = [
    { name: "reset_token_hash", sql: "ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_token_hash TEXT" },
    { name: "reset_expires_at", sql: "ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_expires_at TIMESTAMPTZ" },
  ];

  for (const column of columns) {
    await client.query(column.sql);
  }
}

async function dropUnusedAdminColumns(client) {
  const columns = [
    { name: "parent_admin_id", sql: "ALTER TABLE admins DROP COLUMN IF EXISTS parent_admin_id" },
    { name: "last_login", sql: "ALTER TABLE admins DROP COLUMN IF EXISTS last_login" },
  ];

  for (const column of columns) {
    await client.query(column.sql);
  }
}

async function renameLegacyTables(client) {
  const renames = [
    { from: "admin_accounts", to: "admins" },
    { from: "users", to: "contacts" },
    { from: "messages", to: "contact_messages" },
    { from: "user_requirements", to: "requirements" },
    { from: "user_needs", to: "tasks" },
    { from: "message_templates", to: "templates" },
    { from: "admin_catalog_items", to: "services_products" },
  ];

  for (const { from, to } of renames) {
    if (from === to) continue;
    await client.query(`
      DO $$
      BEGIN
        IF to_regclass('public.${from}') IS NOT NULL
           AND to_regclass('public.${to}') IS NULL THEN
          EXECUTE 'ALTER TABLE ${from} RENAME TO ${to}';
        END IF;
      END $$;
    `);
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

    await renameLegacyTables(client);

    const tableQueries = [
      `
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(150) UNIQUE,
        password_hash TEXT,
        admin_tier VARCHAR(20) DEFAULT 'client_admin' CHECK (admin_tier IN ('super_admin', 'client_admin')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        profession VARCHAR(50) DEFAULT 'astrology',
        profession_request VARCHAR(50),
        profession_requested_at TIMESTAMPTZ,
        whatsapp_number VARCHAR(20),
        whatsapp_name VARCHAR(100),
        whatsapp_connected_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS admin_accounts_admin_tier_idx ON admins (admin_tier)`,
      `CREATE INDEX IF NOT EXISTS admin_accounts_phone_idx ON admins (phone)`,
      `CREATE INDEX IF NOT EXISTS admin_accounts_email_lower_idx ON admins (LOWER(email))`,

      `
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100),
        email VARCHAR(150),
        assigned_admin_id INT NOT NULL REFERENCES admins(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS users_phone_idx ON contacts (phone)`,
      `CREATE INDEX IF NOT EXISTS users_assigned_admin_idx ON contacts (assigned_admin_id)`,
      `CREATE INDEX IF NOT EXISTS users_created_idx ON contacts (created_at)`,
      `CREATE INDEX IF NOT EXISTS users_email_lower_idx ON contacts (LOWER(email))`,

      `
      CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        admin_id INT NOT NULL REFERENCES admins(id),
        message_text TEXT NOT NULL,
        message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('incoming', 'outgoing')),
        status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS messages_user_created_idx ON contact_messages (user_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS messages_admin_created_idx ON contact_messages (admin_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS messages_created_idx ON contact_messages (created_at)`,
      `CREATE INDEX IF NOT EXISTS messages_type_created_idx ON contact_messages (message_type, created_at)`,

      `
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        admin_id INT NOT NULL REFERENCES admins(id),
        order_number VARCHAR(50),
        customer_name VARCHAR(150),
        customer_phone VARCHAR(50),
        customer_email VARCHAR(150),
        channel VARCHAR(50) DEFAULT 'WhatsApp',
        status VARCHAR(20) DEFAULT 'new',
        fulfillment_status VARCHAR(30) DEFAULT 'unfulfilled',
        delivery_method VARCHAR(30),
        delivery_address TEXT,
        currency VARCHAR(10) DEFAULT 'INR',
        items JSONB,
        notes JSONB,
        assigned_to VARCHAR(100),
        placed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS orders_admin_created_idx ON orders (admin_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status)`,
      `CREATE INDEX IF NOT EXISTS orders_fulfillment_idx ON orders (fulfillment_status)`,

      `
      CREATE TABLE IF NOT EXISTS order_billing (
        order_id INT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
        total_amount NUMERIC(10,2),
        currency VARCHAR(10) DEFAULT 'INR',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS order_billing_total_idx ON order_billing (total_amount)`,

      `
      CREATE TABLE IF NOT EXISTS order_payments (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        amount NUMERIC(10,2) NOT NULL,
        method VARCHAR(30),
        status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
        source VARCHAR(20) DEFAULT 'seed',
        notes TEXT,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS order_payments_order_idx ON order_payments (order_id)`,
      `CREATE INDEX IF NOT EXISTS order_payments_status_idx ON order_payments (status)`,

      `
      CREATE TABLE IF NOT EXISTS requirements (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        requirement_text TEXT NOT NULL,
        category VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS user_requirements_user_status_idx ON requirements (user_id, status)`,
      `CREATE INDEX IF NOT EXISTS user_requirements_created_idx ON requirements (created_at)`,

      `
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        admin_id INT NOT NULL REFERENCES admins(id),
        profession VARCHAR(50),
        appointment_type VARCHAR(100),
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        status VARCHAR(20) DEFAULT 'booked' CHECK (status IN ('booked', 'completed', 'cancelled')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE UNIQUE INDEX IF NOT EXISTS appointments_admin_start_idx ON appointments (admin_id, start_time)`,
      `CREATE INDEX IF NOT EXISTS appointments_user_idx ON appointments (user_id)`,
      `CREATE INDEX IF NOT EXISTS appointments_start_idx ON appointments (start_time)`,

      `
      CREATE TABLE IF NOT EXISTS appointment_billing (
        appointment_id INT PRIMARY KEY REFERENCES appointments(id) ON DELETE CASCADE,
        total_amount NUMERIC(10,2),
        currency VARCHAR(10) DEFAULT 'INR',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS appointment_billing_total_idx ON appointment_billing (total_amount)`,

      `
      CREATE TABLE IF NOT EXISTS appointment_payments (
        id SERIAL PRIMARY KEY,
        appointment_id INT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        amount NUMERIC(10,2) NOT NULL,
        method VARCHAR(30),
        status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
        source VARCHAR(20) DEFAULT 'manual',
        notes TEXT,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS appointment_payments_appointment_idx ON appointment_payments (appointment_id)`,
      `CREATE INDEX IF NOT EXISTS appointment_payments_status_idx ON appointment_payments (status)`,

      `
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        need_text TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'completed')),
        assigned_to INT REFERENCES admins(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS user_needs_user_status_idx ON tasks (user_id, status)`,
      `CREATE INDEX IF NOT EXISTS user_needs_created_idx ON tasks (created_at)`,

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
        created_by INT REFERENCES admins(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS broadcasts_status_idx ON broadcasts (status)`,
      `CREATE INDEX IF NOT EXISTS broadcasts_created_by_idx ON broadcasts (created_by)`,
      `CREATE INDEX IF NOT EXISTS broadcasts_created_idx ON broadcasts (created_at)`,

      `
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        category VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        variables_json TEXT,
        created_by INT REFERENCES admins(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS message_templates_category_idx ON templates (category)`,
      `CREATE INDEX IF NOT EXISTS message_templates_created_by_idx ON templates (created_by)`,
      `CREATE INDEX IF NOT EXISTS message_templates_created_idx ON templates (created_at)`,

      `
      CREATE TABLE IF NOT EXISTS services_products (
        id SERIAL PRIMARY KEY,
        admin_id INT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('service', 'product')),
        name VARCHAR(150) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        price_label VARCHAR(60),
        duration_minutes INT,
        details_prompt TEXT,
        keywords TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INT DEFAULT 0,
        is_bookable BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `CREATE INDEX IF NOT EXISTS admin_catalog_items_admin_idx ON services_products (admin_id)`,
      `CREATE INDEX IF NOT EXISTS admin_catalog_items_admin_type_idx ON services_products (admin_id, item_type)`,
      `CREATE INDEX IF NOT EXISTS admin_catalog_items_admin_active_idx ON services_products (admin_id, is_active)`,
    ];

    for (const sql of tableQueries) {
      await client.query(sql);
    }

    await dropUnusedAdminColumns(client);
    await ensureAdminWhatsappColumns(client);
    await ensureAdminProfileColumns(client);
    await ensureAdminAIColumns(client);
    await ensureAdminPasswordResetColumns(client);
    await ensureDefaultSuperAdmin(client);

    console.log("✅ Database ready and verified");
    await client.end();
  } catch (err) {
    console.error("❌ Database init failed:", err.message);
    process.exit(1);
  }
}
