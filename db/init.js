import './load-env.js';
import mysql from "mysql2/promise";
import nodemailer from "nodemailer";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../lib/auth.js";

const DB_NAME = process.env.DB_NAME || "client_handle";

const config = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "root",
  port: Number(process.env.DB_PORT || 3306),
};

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

async function ensureDefaultSuperAdmin(connection) {
  const [existingSuper] = await connection.query(
    `SELECT id FROM admin_accounts WHERE admin_tier = 'super_admin' LIMIT 1`
  );

  if (existingSuper.length > 0) {
    return;
  }

  const [existing] = await connection.query(
    `SELECT id, password_hash, admin_tier FROM admin_accounts WHERE email = ? OR phone = ? LIMIT 1`,
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
      updates.push("password_hash = ?");
      values.push(hashPassword(plainPassword));
    }

    if (updates.length > 0) {
      values.push(record.id);
      await connection.query(
        `UPDATE admin_accounts SET ${updates.join(", ")} WHERE id = ?`,
        values
      );
    }
  } else {
    const plainPassword = generatePassword();
    passwordToSend = plainPassword;
    await connection.query(
      `INSERT INTO admin_accounts (name, phone, email, password_hash, admin_tier, status)
       VALUES (?, ?, ?, ?, 'super_admin', 'active')`,
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

async function dbExists(connection, dbName) {
  const [rows] = await connection.query(
    `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
    [dbName]
  );
  return rows.length > 0;
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [DB_NAME, tableName]
  );
  return rows.length > 0;
}

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_NAME, tableName, columnName]
  );
  return rows.length > 0;
}

async function ensureAdminWhatsappColumns(connection) {
  const tableName = "admin_accounts";
  if (!(await tableExists(connection, tableName))) return;

  const columns = [
    { name: "whatsapp_number", sql: "ALTER TABLE admin_accounts ADD COLUMN whatsapp_number VARCHAR(20)" },
    { name: "whatsapp_name", sql: "ALTER TABLE admin_accounts ADD COLUMN whatsapp_name VARCHAR(100)" },
    { name: "whatsapp_connected_at", sql: "ALTER TABLE admin_accounts ADD COLUMN whatsapp_connected_at DATETIME" },
  ];

  for (const column of columns) {
    const exists = await columnExists(connection, tableName, column.name);
    if (!exists) {
      console.log(`📝 Adding column '${column.name}' to admin_accounts...`);
      await connection.query(column.sql);
    }
  }
}

export async function initDatabase() {
  try {
    // 1️⃣ connect without database first
    const connection = await mysql.createConnection(config);

    console.log("✅ MySQL connected");

    // 2️⃣ check if database exists
    const exists = await dbExists(connection, DB_NAME);
    
    if (exists) {
      console.log(`✅ Database '${DB_NAME}' already exists - skipping creation`);
      await connection.query(`USE ${DB_NAME}`);
    } else {
      console.log(`📝 Creating database '${DB_NAME}'...`);
      // 3️⃣ create database if not exists
      await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
      console.log(`✅ Database '${DB_NAME}' created`);

      // 4️⃣ switch to database
      await connection.query(`USE ${DB_NAME}`);
    }

    // ========== TABLE DEFINITIONS ==========
    const tables = [
      {
        name: "admin_accounts",
        sql: `
          CREATE TABLE admin_accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            phone VARCHAR(20) UNIQUE NOT NULL,
            email VARCHAR(150) UNIQUE,
            password_hash TEXT,
            admin_tier ENUM('super_admin', 'client_admin') DEFAULT 'client_admin',
            status ENUM('active', 'inactive') DEFAULT 'active',
            parent_admin_id INT,
            last_login DATETIME,
            whatsapp_number VARCHAR(20),
            whatsapp_name VARCHAR(100),
            whatsapp_connected_at DATETIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_admin_id) REFERENCES admin_accounts(id),
            INDEX (admin_tier),
            INDEX (phone)
          )
        `,
      },
      {
        name: "users",
        sql: `
          CREATE TABLE users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            phone VARCHAR(20) UNIQUE NOT NULL,
            name VARCHAR(100),
            email VARCHAR(150),
            assigned_admin_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (assigned_admin_id) REFERENCES admin_accounts(id),
            INDEX (phone),
            INDEX (assigned_admin_id)
          )
        `,
      },
      {
        name: "messages",
        sql: `
          CREATE TABLE messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            admin_id INT NOT NULL,
            message_text TEXT NOT NULL,
            message_type ENUM('incoming', 'outgoing') NOT NULL,
            status ENUM('sent', 'delivered', 'read') DEFAULT 'sent',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (admin_id) REFERENCES admin_accounts(id),
            INDEX (user_id, created_at),
            INDEX (admin_id, created_at)
          )
        `,
      },
      {
        name: "user_requirements",
        sql: `
          CREATE TABLE user_requirements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            requirement_text TEXT NOT NULL,
            category VARCHAR(100),
            status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX (user_id, status)
          )
        `,
      },
      {
        name: "user_needs",
        sql: `
          CREATE TABLE user_needs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            need_text TEXT NOT NULL,
            priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
            status ENUM('open', 'assigned', 'completed') DEFAULT 'open',
            assigned_to INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_to) REFERENCES admin_accounts(id),
            INDEX (user_id, status)
          )
        `,
      },
      {
        name: "broadcasts",
        sql: `
          CREATE TABLE broadcasts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(150) NOT NULL,
            message TEXT NOT NULL,
            target_audience_type VARCHAR(50) DEFAULT 'all',
            scheduled_at DATETIME,
            status ENUM('draft', 'scheduled', 'sent', 'failed') DEFAULT 'draft',
            sent_count INT DEFAULT 0,
            delivered_count INT DEFAULT 0,
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES admin_accounts(id),
            INDEX (status),
            INDEX (created_by)
          )
        `,
      },
      {
        name: "message_templates",
        sql: `
          CREATE TABLE message_templates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            category VARCHAR(100) NOT NULL,
            content TEXT NOT NULL,
            variables_json TEXT,
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES admin_accounts(id),
            INDEX (category),
            INDEX (created_by)
          )
        `,
      },
    ];

    let createdCount = 0;
    for (const table of tables) {
      const exists = await tableExists(connection, table.name);
      if (exists) {
        console.log(`✅ Table '${table.name}' already exists - skipping`);
        continue;
      }
      console.log(`📝 Creating table '${table.name}'...`);
      await connection.query(table.sql);
      createdCount += 1;
    }

    if (createdCount === 0) {
      console.log("✅ All tables already exist");
    } else {
      console.log(`✅ Tables created: ${createdCount}/${tables.length}`);
    }

    await ensureAdminWhatsappColumns(connection);
    await ensureDefaultSuperAdmin(connection);
    console.log("✅ Database ready and verified");

    await connection.end();
  } catch (err) {
    console.error("❌ Database init failed:", err.message);
    process.exit(1);
  }
}
