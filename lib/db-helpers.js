import { getConnection } from "./db";

// Get all users with their admin info
export async function getAllUsers(adminId = null, { search = '', limit = 50, offset = 0 } = {}) {
  const connection = await getConnection();
  try {
    const params = [];
    const whereParts = [];
    if (adminId) {
      whereParts.push('u.assigned_admin_id = ?');
      params.push(adminId);
    }
    if (search) {
      const q = `%${search.toLowerCase()}%`;
      whereParts.push('(LOWER(u.name) LIKE ? OR u.phone LIKE ? OR LOWER(u.email) LIKE ?)');
      params.push(q, q, q);
    }
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const [users] = await connection.query(
      `
        SELECT u.*, a.name as admin_name
        FROM users u
        LEFT JOIN admin_accounts a ON u.assigned_admin_id = a.id
        ${whereClause}
        ORDER BY u.created_at DESC, u.id DESC
        LIMIT ?
        OFFSET ?
      `,
      [...params, limit, offset]
    );
    return users;
  } finally {
    connection.release();
  }
}

// Get user by ID
export async function getUserById(userId, adminId = null) {
  const connection = await getConnection();
  try {
    const params = [userId];
    let whereClause = 'WHERE u.id = ?';
    if (adminId) {
      whereClause += ' AND u.assigned_admin_id = ?';
      params.push(adminId);
    }
    const [user] = await connection.query(
      `
        SELECT u.*, a.name as admin_name
        FROM users u
        LEFT JOIN admin_accounts a ON u.assigned_admin_id = a.id
        ${whereClause}
      `,
      params
    );
    return user[0];
  } finally {
    connection.release();
  }
}

// Get all messages with user and admin details
export async function getAllMessages(adminId = null, { search = '', limit = 50, offset = 0 } = {}) {
  const connection = await getConnection();
  try {
    const params = [];
    const whereParts = [];
    if (adminId) {
      whereParts.push('m.admin_id = ?');
      params.push(adminId);
    }
    if (search) {
      const q = `%${search.toLowerCase()}%`;
      whereParts.push('(LOWER(u.name) LIKE ? OR u.phone LIKE ? OR LOWER(m.message_text) LIKE ?)');
      params.push(q, q, q);
    }
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const [messages] = await connection.query(
      `
        SELECT m.*, u.name as user_name, u.phone, a.name as admin_name
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.id
        LEFT JOIN admin_accounts a ON m.admin_id = a.id
        ${whereClause}
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT ?
        OFFSET ?
      `,
      [...params, limit, offset]
    );
    return messages;
  } finally {
    connection.release();
  }
}

// Get messages for a specific user
export async function getMessagesForUser(
  userId,
  adminId = null,
  { limit = 50, offset = 0, before = null } = {}
) {
  const connection = await getConnection();
  try {
    const params = [userId];
    const whereParts = ['m.user_id = ?'];
    if (adminId) {
      whereParts.push('m.admin_id = ?');
      params.push(adminId);
    }
    if (before) {
      whereParts.push('m.created_at < ?');
      params.push(before);
    }
    const whereClause = `WHERE ${whereParts.join(' AND ')}`;
    const [messages] = await connection.query(
      `
        SELECT m.*, u.name as user_name, a.name as admin_name
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.id
        LEFT JOIN admin_accounts a ON m.admin_id = a.id
        ${whereClause}
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT ?
        OFFSET ?
      `,
      [...params, limit, offset]
    );
    return messages;
  } finally {
    connection.release();
  }
}

// Get all requirements with user info
export async function getAllRequirements(
  adminId = null,
  { search = '', status = 'all', limit = 50, offset = 0 } = {}
) {
  const connection = await getConnection();
  try {
    const params = [];
    const whereParts = [];
    if (adminId) {
      whereParts.push('u.assigned_admin_id = ?');
      params.push(adminId);
    }
    if (status && status !== 'all') {
      whereParts.push('r.status = ?');
      params.push(status);
    }
    if (search) {
      const q = `%${search.toLowerCase()}%`;
      whereParts.push('(LOWER(u.name) LIKE ? OR LOWER(r.requirement_text) LIKE ?)');
      params.push(q, q);
    }
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const [requirements] = await connection.query(
      `
        SELECT r.*, u.name, u.phone
        FROM user_requirements r
        LEFT JOIN users u ON r.user_id = u.id
        ${whereClause}
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT ?
        OFFSET ?
      `,
      [...params, limit, offset]
    );
    return requirements;
  } finally {
    connection.release();
  }
}

export async function updateRequirementStatus(requirementId, status, adminId = null) {
  const connection = await getConnection();
  try {
    if (adminId) {
      await connection.query(
        `UPDATE user_requirements r
         SET status = ?
         FROM users u
         WHERE r.user_id = u.id AND r.id = ? AND u.assigned_admin_id = ?`,
        [status, requirementId, adminId]
      );
    } else {
      await connection.query(
        `UPDATE user_requirements SET status = ? WHERE id = ?`,
        [status, requirementId]
      );
    }

    const params = [requirementId];
    let whereClause = 'WHERE r.id = ?';
    if (adminId) {
      whereClause += ' AND u.assigned_admin_id = ?';
      params.push(adminId);
    }
    const [rows] = await connection.query(
      `SELECT r.*, u.name, u.phone
       FROM user_requirements r
       LEFT JOIN users u ON r.user_id = u.id
       ${whereClause}
       LIMIT 1`,
      params
    );
    return rows[0] || null;
  } finally {
    connection.release();
  }
}

// Get all needs with user and admin info
export async function getAllNeeds(
  adminId = null,
  { search = '', status = 'all', limit = 50, offset = 0 } = {}
) {
  const connection = await getConnection();
  try {
    const params = [];
    const whereParts = [];
    if (adminId) {
      whereParts.push('u.assigned_admin_id = ?');
      params.push(adminId);
    }
    if (status && status !== 'all') {
      whereParts.push('n.status = ?');
      params.push(status);
    }
    if (search) {
      const q = `%${search.toLowerCase()}%`;
      whereParts.push('(LOWER(u.name) LIKE ? OR LOWER(n.need_text) LIKE ?)');
      params.push(q, q);
    }
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const [needs] = await connection.query(
      `
        SELECT n.*, u.name, u.phone, a.name as assigned_admin_name
        FROM user_needs n
        LEFT JOIN users u ON n.user_id = u.id
        LEFT JOIN admin_accounts a ON n.assigned_to = a.id
        ${whereClause}
        ORDER BY n.created_at DESC, n.id DESC
        LIMIT ?
        OFFSET ?
      `,
      [...params, limit, offset]
    );
    return needs;
  } finally {
    connection.release();
  }
}

// Add new user
export async function addUser(phone, name, email, assigned_admin_id) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(
      `
        INSERT INTO users (phone, name, email, assigned_admin_id)
        VALUES (?, ?, ?, ?)
        RETURNING id
      `,
      [phone, name, email, assigned_admin_id]
    );
    return rows[0]?.id || null;
  } finally {
    connection.release();
  }
}

// Add new message
export async function addMessage(user_id, admin_id, message_text, message_type) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(
      `
        INSERT INTO messages (user_id, admin_id, message_text, message_type, status)
        VALUES (?, ?, ?, ?, 'sent')
        RETURNING id
      `,
      [user_id, admin_id, message_text, message_type]
    );
    return rows[0]?.id || null;
  } finally {
    connection.release();
  }
}

// Get dashboard stats
export async function getDashboardStats(adminId = null) {
  const connection = await getConnection();
  try {
    if (!adminId) {
      const [stats] = await connection.query(`
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM messages WHERE message_type = 'incoming') as incoming_messages,
          (SELECT COUNT(*) FROM user_requirements WHERE status = 'in_progress') as active_requirements,
          (SELECT COUNT(*) FROM user_needs WHERE status = 'open') as open_needs
      `);
      return stats[0];
    }

    const [stats] = await connection.query(
      `
        SELECT
          (SELECT COUNT(*) FROM users WHERE assigned_admin_id = ?) as total_users,
          (SELECT COUNT(*) FROM messages WHERE message_type = 'incoming' AND admin_id = ?) as incoming_messages,
          (SELECT COUNT(*)
           FROM user_requirements r
           JOIN users u ON r.user_id = u.id
           WHERE r.status = 'in_progress' AND u.assigned_admin_id = ?) as active_requirements,
          (SELECT COUNT(*)
           FROM user_needs n
           JOIN users u ON n.user_id = u.id
           WHERE n.status = 'open' AND u.assigned_admin_id = ?) as open_needs
      `,
      [adminId, adminId, adminId, adminId]
    );
    return stats[0];
  } finally {
    connection.release();
  }
}

export async function getAdminById(adminId) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(
      `SELECT id, name, email, phone, admin_tier, status,
              whatsapp_number, whatsapp_name, whatsapp_connected_at,
              ai_enabled, ai_prompt, ai_blocklist,
              created_at, updated_at
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

export async function getAdmins() {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(
      `SELECT id, name, email, phone, admin_tier, status, created_at, updated_at
       FROM admin_accounts
       ORDER BY created_at DESC`
    );
    return rows;
  } finally {
    connection.release();
  }
}

export async function updateAdminAccess(adminId, { admin_tier, status }) {
  const connection = await getConnection();
  try {
    const updates = [];
    const values = [];
    if (admin_tier) {
      updates.push('admin_tier = ?');
      values.push(admin_tier);
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (updates.length === 0) {
      const [rows] = await connection.query(
        `SELECT id, name, email, phone, admin_tier, status, created_at, updated_at
         FROM admin_accounts
         WHERE id = ?
         LIMIT 1`,
        [adminId]
      );
      return rows[0] || null;
    }
    values.push(adminId);
    await connection.query(
      `UPDATE admin_accounts SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
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

export async function getAdminAISettings(adminId) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(
      `SELECT ai_enabled, ai_prompt, ai_blocklist
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

export async function updateAdminAISettings(adminId, { ai_enabled, ai_prompt, ai_blocklist }) {
  const connection = await getConnection();
  try {
    const updates = [];
    const values = [];

    if (typeof ai_enabled === 'boolean') {
      updates.push('ai_enabled = ?');
      values.push(ai_enabled);
    }
    if (typeof ai_prompt === 'string') {
      updates.push('ai_prompt = ?');
      values.push(ai_prompt.trim() || null);
    }
    if (typeof ai_blocklist === 'string') {
      updates.push('ai_blocklist = ?');
      values.push(ai_blocklist.trim() || null);
    }

    if (updates.length === 0) {
      return await getAdminAISettings(adminId);
    }

    values.push(adminId);
    await connection.query(
      `UPDATE admin_accounts SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return await getAdminAISettings(adminId);
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

export async function getAllBroadcasts(
  adminId = null,
  { search = '', limit = 50, offset = 0 } = {}
) {
  const connection = await getConnection();
  try {
    const params = [];
    const whereParts = [];
    if (adminId) {
      whereParts.push('b.created_by = ?');
      params.push(adminId);
    }
    if (search) {
      const q = `%${search.toLowerCase()}%`;
      whereParts.push('(LOWER(b.title) LIKE ? OR LOWER(b.message) LIKE ?)');
      params.push(q, q);
    }
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const [rows] = await connection.query(
      `
        SELECT b.*, a.name as created_by_name
        FROM broadcasts b
        LEFT JOIN admin_accounts a ON b.created_by = a.id
        ${whereClause}
        ORDER BY b.created_at DESC, b.id DESC
        LIMIT ?
        OFFSET ?
      `,
      [...params, limit, offset]
    );
    return rows;
  } finally {
    connection.release();
  }
}

export async function getBroadcastStats(adminId = null) {
  const connection = await getConnection();
  try {
    const params = [];
    let whereClause = '';
    if (adminId) {
      whereClause = 'WHERE created_by = ?';
      params.push(adminId);
    }
    const [rows] = await connection.query(
      `
        SELECT
          COUNT(*)::int as total_count,
          COALESCE(SUM(sent_count), 0)::int as total_sent,
          COALESCE(SUM(delivered_count), 0)::int as total_delivered,
          SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END)::int as scheduled_count
        FROM broadcasts
        ${whereClause}
      `,
      params
    );
    return rows[0] || {
      total_count: 0,
      total_sent: 0,
      total_delivered: 0,
      scheduled_count: 0,
    };
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
    const [rows] = await connection.query(
      `INSERT INTO broadcasts
       (title, message, target_audience_type, scheduled_at, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        title,
        message,
        targetAudienceType || 'all',
        scheduledAt || null,
        status || 'draft',
        createdBy || null,
      ]
    );
    return await getBroadcastById(rows[0]?.id);
  } finally {
    connection.release();
  }
}

export async function getAllTemplates(
  adminId = null,
  { search = '', limit = 50, offset = 0 } = {}
) {
  const connection = await getConnection();
  try {
    const params = [];
    const whereParts = [];
    if (adminId) {
      whereParts.push('t.created_by = ?');
      params.push(adminId);
    }
    if (search) {
      const q = `%${search.toLowerCase()}%`;
      whereParts.push('(LOWER(t.name) LIKE ? OR LOWER(t.category) LIKE ? OR LOWER(t.content) LIKE ?)');
      params.push(q, q, q);
    }
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const [rows] = await connection.query(
      `
        SELECT t.*, a.name as created_by_name
        FROM message_templates t
        LEFT JOIN admin_accounts a ON t.created_by = a.id
        ${whereClause}
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT ?
        OFFSET ?
      `,
      [...params, limit, offset]
    );
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
    const [rows] = await connection.query(
      `INSERT INTO message_templates (name, category, content, variables_json, created_by)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id`,
      [name, category, content, variablesJson, createdBy || null]
    );
    return await getTemplateById(rows[0]?.id);
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
          WHEN m.created_at >= (NOW() - INTERVAL '7 days') THEN m.user_id
          ELSE NULL
        END) AS active_chats
      FROM admin_accounts a
      LEFT JOIN messages m ON m.admin_id = a.id
      GROUP BY a.id, a.name, a.admin_tier, a.status, a.created_at
      ORDER BY a.created_at DESC
    `);
    return rows;
  } finally {
    connection.release();
  }
}

export async function getReportOverview(startDate, adminId = null) {
  const connection = await getConnection();
  try {
    const messageParams = [startDate];
    let messageWhere = 'WHERE created_at >= ?';
    if (adminId) {
      messageWhere += ' AND admin_id = ?';
      messageParams.push(adminId);
    }
    const [messageStats] = await connection.query(
      `
        SELECT date_trunc('day', created_at) as date, COUNT(*) as count
        FROM messages
        ${messageWhere}
        GROUP BY date_trunc('day', created_at)
        ORDER BY date_trunc('day', created_at)
      `,
      messageParams
    );

    if (adminId) {
      const [leadStats] = await connection.query(
        `
          SELECT r.status, COUNT(*) as count
          FROM user_requirements r
          JOIN users u ON r.user_id = u.id
          WHERE u.assigned_admin_id = ?
          GROUP BY r.status
        `,
        [adminId]
      );

      const [agentPerformance] = await connection.query(
        `
          SELECT
            a.id,
            a.name,
            a.admin_tier,
            a.status,
            SUM(CASE WHEN m.message_type = 'outgoing' THEN 1 ELSE 0 END) AS messages_sent,
            COUNT(DISTINCT CASE
              WHEN m.created_at >= (NOW() - INTERVAL '7 days') THEN m.user_id
              ELSE NULL
            END) AS active_chats
          FROM admin_accounts a
          LEFT JOIN messages m ON m.admin_id = a.id
          WHERE a.id = ?
          GROUP BY a.id, a.name, a.admin_tier, a.status
        `,
        [adminId]
      );

      const [topCampaigns] = await connection.query(
        `
          SELECT id, title, status, sent_count, delivered_count, created_at
          FROM broadcasts
          WHERE created_by = ?
          ORDER BY sent_count DESC, created_at DESC
          LIMIT 5
        `,
        [adminId]
      );

      return {
        messageStats,
        leadStats,
        agentPerformance,
        topCampaigns,
        revenueSources: [],
      };
    }

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
          WHEN m.created_at >= (NOW() - INTERVAL '7 days') THEN m.user_id
          ELSE NULL
        END) AS active_chats
      FROM admin_accounts a
      LEFT JOIN messages m ON m.admin_id = a.id
      GROUP BY a.id, a.name, a.admin_tier, a.status, a.created_at
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
