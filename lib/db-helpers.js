import { getConnection } from "./db";

// Get all users with their admin info
export async function getAllUsers() {
  const connection = await getConnection();
  try {
    const [users] = await connection.query(`
      SELECT u.*, a.name as admin_name 
      FROM users u 
      LEFT JOIN admin_accounts a ON u.assigned_admin_id = a.id
      ORDER BY u.created_at DESC
    `);
    return users;
  } finally {
    connection.release();
  }
}

// Get user by ID
export async function getUserById(userId) {
  const connection = await getConnection();
  try {
    const [user] = await connection.query(`
      SELECT u.*, a.name as admin_name 
      FROM users u 
      LEFT JOIN admin_accounts a ON u.assigned_admin_id = a.id
      WHERE u.id = ?
    `, [userId]);
    return user[0];
  } finally {
    connection.release();
  }
}

// Get all messages with user and admin details
export async function getAllMessages() {
  const connection = await getConnection();
  try {
    const [messages] = await connection.query(`
      SELECT m.*, u.name as user_name, u.phone, a.name as admin_name 
      FROM messages m 
      LEFT JOIN users u ON m.user_id = u.id 
      LEFT JOIN admin_accounts a ON m.admin_id = a.id
      ORDER BY m.created_at DESC
    `);
    return messages;
  } finally {
    connection.release();
  }
}

// Get messages for a specific user
export async function getMessagesForUser(userId) {
  const connection = await getConnection();
  try {
    const [messages] = await connection.query(`
      SELECT m.*, u.name as user_name, a.name as admin_name 
      FROM messages m 
      LEFT JOIN users u ON m.user_id = u.id 
      LEFT JOIN admin_accounts a ON m.admin_id = a.id
      WHERE m.user_id = ?
      ORDER BY m.created_at DESC
    `, [userId]);
    return messages;
  } finally {
    connection.release();
  }
}

// Get all requirements with user info
export async function getAllRequirements() {
  const connection = await getConnection();
  try {
    const [requirements] = await connection.query(`
      SELECT r.*, u.name, u.phone 
      FROM user_requirements r 
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `);
    return requirements;
  } finally {
    connection.release();
  }
}

export async function updateRequirementStatus(requirementId, status) {
  const connection = await getConnection();
  try {
    await connection.query(
      `UPDATE user_requirements SET status = ? WHERE id = ?`,
      [status, requirementId]
    );
    const [rows] = await connection.query(
      `SELECT r.*, u.name, u.phone 
       FROM user_requirements r 
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = ?
       LIMIT 1`,
      [requirementId]
    );
    return rows[0] || null;
  } finally {
    connection.release();
  }
}

// Get all needs with user and admin info
export async function getAllNeeds() {
  const connection = await getConnection();
  try {
    const [needs] = await connection.query(`
      SELECT n.*, u.name, u.phone, a.name as assigned_admin_name 
      FROM user_needs n 
      LEFT JOIN users u ON n.user_id = u.id 
      LEFT JOIN admin_accounts a ON n.assigned_to = a.id
      ORDER BY n.created_at DESC
    `);
    return needs;
  } finally {
    connection.release();
  }
}

// Add new user
export async function addUser(phone, name, email, assigned_admin_id) {
  const connection = await getConnection();
  try {
    const [result] = await connection.query(`
      INSERT INTO users (phone, name, email, assigned_admin_id) 
      VALUES (?, ?, ?, ?)
    `, [phone, name, email, assigned_admin_id]);
    return result.insertId;
  } finally {
    connection.release();
  }
}

// Add new message
export async function addMessage(user_id, admin_id, message_text, message_type) {
  const connection = await getConnection();
  try {
    const [result] = await connection.query(`
      INSERT INTO messages (user_id, admin_id, message_text, message_type, status) 
      VALUES (?, ?, ?, ?, 'sent')
    `, [user_id, admin_id, message_text, message_type]);
    return result.insertId;
  } finally {
    connection.release();
  }
}

// Get dashboard stats
export async function getDashboardStats() {
  const connection = await getConnection();
  try {
    const [stats] = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM messages WHERE message_type = 'incoming') as incoming_messages,
        (SELECT COUNT(*) FROM user_requirements WHERE status = 'in_progress') as active_requirements,
        (SELECT COUNT(*) FROM user_needs WHERE status = 'open') as open_needs
    `);
    return stats[0];
  } finally {
    connection.release();
  }
}

export async function getAdminById(adminId) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(
      `SELECT id, name, email, phone, admin_tier, status, created_at, updated_at
       FROM admin_accounts
       WHERE id = ?
       LIMIT 1`,
      [adminId]
    );
    return rows[0] || null;
  } finally {
    connection.release();
  }
}

export async function updateAdminProfile(adminId, { name, email }) {
  const connection = await getConnection();
  try {
    const updates = [];
    const values = [];
    if (typeof name === 'string') {
      updates.push('name = ?');
      values.push(name.trim());
    }
    if (typeof email === 'string') {
      updates.push('email = ?');
      values.push(email.trim() || null);
    }
    if (updates.length === 0) {
      return await getAdminById(adminId);
    }
    values.push(adminId);
    await connection.query(
      `UPDATE admin_accounts SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return await getAdminById(adminId);
  } finally {
    connection.release();
  }
}

function parseTemplateVariables(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

export async function getAllBroadcasts() {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT b.*, a.name as created_by_name
      FROM broadcasts b
      LEFT JOIN admin_accounts a ON b.created_by = a.id
      ORDER BY b.created_at DESC
    `);
    return rows;
  } finally {
    connection.release();
  }
}

export async function getBroadcastById(broadcastId) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(
      `SELECT b.*, a.name as created_by_name
       FROM broadcasts b
       LEFT JOIN admin_accounts a ON b.created_by = a.id
       WHERE b.id = ?
       LIMIT 1`,
      [broadcastId]
    );
    return rows[0] || null;
  } finally {
    connection.release();
  }
}

export async function createBroadcast({
  title,
  message,
  targetAudienceType,
  scheduledAt,
  status,
  createdBy,
}) {
  const connection = await getConnection();
  try {
    const [result] = await connection.query(
      `INSERT INTO broadcasts
       (title, message, target_audience_type, scheduled_at, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        title,
        message,
        targetAudienceType || 'all',
        scheduledAt || null,
        status || 'draft',
        createdBy || null,
      ]
    );
    return await getBroadcastById(result.insertId);
  } finally {
    connection.release();
  }
}

export async function getAllTemplates() {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT t.*, a.name as created_by_name
      FROM message_templates t
      LEFT JOIN admin_accounts a ON t.created_by = a.id
      ORDER BY t.created_at DESC
    `);
    return rows.map((row) => ({
      ...row,
      variables: parseTemplateVariables(row.variables_json),
    }));
  } finally {
    connection.release();
  }
}

export async function getTemplateById(templateId) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(
      `SELECT t.*, a.name as created_by_name
       FROM message_templates t
       LEFT JOIN admin_accounts a ON t.created_by = a.id
       WHERE t.id = ?
       LIMIT 1`,
      [templateId]
    );
    const row = rows[0];
    if (!row) return null;
    return { ...row, variables: parseTemplateVariables(row.variables_json) };
  } finally {
    connection.release();
  }
}

export async function createTemplate({ name, category, content, variables, createdBy }) {
  const connection = await getConnection();
  try {
    const variablesJson = Array.isArray(variables) ? JSON.stringify(variables) : null;
    const [result] = await connection.query(
      `INSERT INTO message_templates (name, category, content, variables_json, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [name, category, content, variablesJson, createdBy || null]
    );
    return await getTemplateById(result.insertId);
  } finally {
    connection.release();
  }
}

export async function getTeamMembers() {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT
        a.id,
        a.name,
        a.email,
        a.admin_tier,
        a.status,
        SUM(CASE WHEN m.message_type = 'outgoing' THEN 1 ELSE 0 END) AS messages_sent,
        COUNT(DISTINCT CASE
          WHEN m.created_at >= (NOW() - INTERVAL 7 DAY) THEN m.user_id
          ELSE NULL
        END) AS active_chats
      FROM admin_accounts a
      LEFT JOIN messages m ON m.admin_id = a.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);
    return rows;
  } finally {
    connection.release();
  }
}

export async function getReportOverview(startDate) {
  const connection = await getConnection();
  try {
    const [messageStats] = await connection.query(
      `
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM messages
        WHERE created_at >= ?
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `,
      [startDate]
    );

    const [leadStats] = await connection.query(
      `
        SELECT status, COUNT(*) as count
        FROM user_requirements
        GROUP BY status
      `
    );

    const [agentPerformance] = await connection.query(`
      SELECT
        a.id,
        a.name,
        a.admin_tier,
        a.status,
        SUM(CASE WHEN m.message_type = 'outgoing' THEN 1 ELSE 0 END) AS messages_sent,
        COUNT(DISTINCT CASE
          WHEN m.created_at >= (NOW() - INTERVAL 7 DAY) THEN m.user_id
          ELSE NULL
        END) AS active_chats
      FROM admin_accounts a
      LEFT JOIN messages m ON m.admin_id = a.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);

    const [topCampaigns] = await connection.query(`
      SELECT id, title, status, sent_count, delivered_count, created_at
      FROM broadcasts
      ORDER BY sent_count DESC, created_at DESC
      LIMIT 5
    `);

    return {
      messageStats,
      leadStats,
      agentPerformance,
      topCampaigns,
      revenueSources: [],
    };
  } finally {
    connection.release();
  }
}
