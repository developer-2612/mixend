import pg from "pg";

const { Pool } = pg;

let pool;

const formatQuery = (text, params = []) => {
  if (!params.length) return text;
  let index = 0;
  return text.replace(/\?/g, () => `$${++index}`);
};

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function getConnection() {
  const client = await getPool().connect();
  const query = async (text, params = []) => {
    const sql = formatQuery(text, params);
    const result = await client.query(sql, params);
    return [result.rows, result];
  };
  return {
    query,
    execute: query,
    release: () => client.release(),
  };
}

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
        FROM contacts u
        LEFT JOIN admins a ON u.assigned_admin_id = a.id
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

export async function countUsersSince(adminId = null, since = null) {
  const connection = await getConnection();
  try {
    const params = [];
    const whereParts = [];
    if (adminId) {
      whereParts.push('u.assigned_admin_id = ?');
      params.push(adminId);
    }
    if (since) {
      whereParts.push('u.created_at > ?');
      params.push(since);
    }
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const [rows] = await connection.query(
      `
        SELECT COUNT(*) as count
        FROM contacts u
        ${whereClause}
      `,
      params
    );
    return Number(rows?.[0]?.count || 0);
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
        FROM contacts u
        LEFT JOIN admins a ON u.assigned_admin_id = a.id
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
        FROM contact_messages m
        LEFT JOIN contacts u ON m.user_id = u.id
        LEFT JOIN admins a ON m.admin_id = a.id
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

export async function deleteMessagesOlderThan(days = 15) {
  const connection = await getConnection();
  try {
    const safeDays = Number.isFinite(Number(days)) ? Number(days) : 15;
    const interval = `${safeDays} days`;
    await connection.query(
      `DELETE FROM contact_messages WHERE created_at < NOW() - ($1::interval)`,
      [interval]
    );
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
        FROM contact_messages m
        LEFT JOIN contacts u ON m.user_id = u.id
        LEFT JOIN admins a ON m.admin_id = a.id
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
        FROM requirements r
        LEFT JOIN contacts u ON r.user_id = u.id
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
        `UPDATE requirements r
         SET status = ?
         FROM contacts u
         WHERE r.user_id = u.id AND r.id = ? AND u.assigned_admin_id = ?`,
        [status, requirementId, adminId]
      );
    } else {
      await connection.query(
        `UPDATE requirements SET status = ? WHERE id = ?`,
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
       FROM requirements r
       LEFT JOIN contacts u ON r.user_id = u.id
       ${whereClause}
       LIMIT 1`,
      params
    );
    return rows[0] || null;
  } finally {
    connection.release();
  }
}

export async function getAppointments(
  adminId = null,
  { search = '', status = 'all', limit = 50, offset = 0 } = {}
) {
  const connection = await getConnection();
  try {
    const params = [];
    const whereParts = [];
    if (adminId) {
      whereParts.push('a.admin_id = ?');
      params.push(adminId);
    }
    if (status && status !== 'all') {
      whereParts.push('a.status = ?');
      params.push(status);
    }
    if (search) {
      const q = `%${search.toLowerCase()}%`;
      whereParts.push('(LOWER(u.name) LIKE ? OR u.phone LIKE ? OR LOWER(a.appointment_type) LIKE ?)');
      params.push(q, q, q);
    }
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const [rows] = await connection.query(
      `
        ${appointmentSelectWithPayments}
        ${whereClause}
        ORDER BY a.start_time DESC, a.id DESC
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

const normalizeAmount = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const upsertAppointmentBilling = async (
  connection,
  appointmentId,
  { total_amount, currency, notes }
) => {
  const [rows] = await connection.query(
    `
      INSERT INTO appointment_billing (appointment_id, total_amount, currency, notes)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (appointment_id) DO UPDATE
      SET total_amount = EXCLUDED.total_amount,
          currency = COALESCE(EXCLUDED.currency, appointment_billing.currency),
          notes = COALESCE(EXCLUDED.notes, appointment_billing.notes),
          updated_at = NOW()
      RETURNING appointment_id
    `,
    [appointmentId, total_amount, currency || null, notes || null]
  );
  return rows[0] || null;
};

const replaceManualPayment = async (
  connection,
  appointmentId,
  { amount, method, notes }
) => {
  await connection.query(
    `DELETE FROM appointment_payments WHERE appointment_id = ? AND source = 'manual'`,
    [appointmentId]
  );
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const [rows] = await connection.query(
    `
      INSERT INTO appointment_payments
        (appointment_id, amount, method, status, source, notes, paid_at)
      VALUES (?, ?, ?, 'paid', 'manual', ?, NOW())
      RETURNING id
    `,
    [appointmentId, amount, method || null, notes || null]
  );
  return rows[0] || null;
};

const appointmentSelectWithPayments = `
  SELECT
    a.*,
    u.name as user_name,
    u.phone,
    u.email,
    b.total_amount as payment_total,
    COALESCE(p.paid_total, 0) as payment_paid,
    GREATEST(COALESCE(b.total_amount, 0) - COALESCE(p.paid_total, 0), 0) as payment_due,
    CASE
      WHEN b.total_amount IS NULL THEN 'unpaid'
      WHEN COALESCE(p.paid_total, 0) <= 0 THEN 'unpaid'
      WHEN COALESCE(p.paid_total, 0) < b.total_amount THEN 'partial'
      ELSE 'paid'
    END as payment_status,
    lp.method as payment_method,
    b.notes as payment_notes
  FROM appointments a
  LEFT JOIN contacts u ON a.user_id = u.id
  LEFT JOIN appointment_billing b ON b.appointment_id = a.id
  LEFT JOIN (
    SELECT appointment_id, COALESCE(SUM(amount), 0) as paid_total
    FROM appointment_payments
    WHERE status = 'paid'
    GROUP BY appointment_id
  ) p ON p.appointment_id = a.id
  LEFT JOIN (
    SELECT DISTINCT ON (appointment_id)
      appointment_id, method, notes, paid_at
    FROM appointment_payments
    WHERE status = 'paid'
    ORDER BY appointment_id, paid_at DESC NULLS LAST, id DESC
  ) lp ON lp.appointment_id = a.id
`;

export async function updateAppointment(appointmentId, updates = {}, adminId = null) {
  const connection = await getConnection();
  try {
    const fields = [];
    const params = [];

    if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
      fields.push('status = ?');
      params.push(updates.status);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'appointment_type')) {
      fields.push('appointment_type = ?');
      params.push(updates.appointment_type || null);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'start_time')) {
      fields.push('start_time = ?');
      params.push(updates.start_time);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'end_time')) {
      fields.push('end_time = ?');
      params.push(updates.end_time);
    }
    const hasBillingUpdate =
      Object.prototype.hasOwnProperty.call(updates, 'payment_total') ||
      Object.prototype.hasOwnProperty.call(updates, 'payment_notes');
    const hasPaymentUpdate =
      Object.prototype.hasOwnProperty.call(updates, 'payment_paid') ||
      Object.prototype.hasOwnProperty.call(updates, 'payment_method');

    const normalizedTotal = normalizeAmount(updates.payment_total);
    const normalizedPaid = normalizeAmount(updates.payment_paid);

    if (fields.length > 0) {
      fields.push('updated_at = NOW()');
      params.push(appointmentId);
      if (adminId) {
        params.push(adminId);
      }

      if (adminId) {
        await connection.query(
          `UPDATE appointments a
           SET ${fields.join(', ')}
           FROM contacts u
           WHERE a.user_id = u.id AND a.id = ? AND a.admin_id = ?`,
          params
        );
      } else {
        await connection.query(
          `UPDATE appointments
           SET ${fields.join(', ')}
           WHERE id = ?`,
          params
        );
      }
    }

    if (hasBillingUpdate) {
      await upsertAppointmentBilling(connection, appointmentId, {
        total_amount: normalizedTotal,
        currency: updates.payment_currency || null,
        notes: updates.payment_notes || null,
      });
    }

    if (hasPaymentUpdate) {
      await replaceManualPayment(connection, appointmentId, {
        amount: normalizedPaid,
        method: updates.payment_method || null,
        notes: updates.payment_notes || null,
      });
    }

    if (fields.length === 0 && !hasBillingUpdate && !hasPaymentUpdate) {
      return null;
    }

    const fetchParams = [appointmentId];
    let whereClause = 'WHERE a.id = ?';
    if (adminId) {
      whereClause += ' AND a.admin_id = ?';
      fetchParams.push(adminId);
    }
    const [rows] = await connection.query(
      `
        ${appointmentSelectWithPayments}
        ${whereClause}
        LIMIT 1
      `,
      fetchParams
    );
    return rows[0] || null;
  } finally {
    connection.release();
  }
}

export async function updateAppointmentStatus(appointmentId, status, adminId = null) {
  return updateAppointment(appointmentId, { status }, adminId);
}

export async function createAppointment(
  {
    user_id,
    admin_id,
    profession,
    appointment_type,
    start_time,
    end_time,
    status = 'booked',
    payment_total,
    payment_paid,
    payment_method,
    payment_notes,
  } = {}
) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(
      `
        INSERT INTO appointments
          (user_id, admin_id, profession, appointment_type, start_time, end_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING id
      `,
      [
        user_id,
        admin_id,
        profession || null,
        appointment_type || null,
        start_time,
        end_time,
        status,
      ]
    );
    const appointmentId = rows?.[0]?.id;
    if (!appointmentId) return null;

    const normalizedTotal = normalizeAmount(payment_total);
    const normalizedPaid = normalizeAmount(payment_paid);

    if (normalizedTotal !== null || payment_notes) {
      await upsertAppointmentBilling(connection, appointmentId, {
        total_amount: normalizedTotal,
        currency: null,
        notes: payment_notes || null,
      });
    }

    if (normalizedPaid !== null || payment_method) {
      await replaceManualPayment(connection, appointmentId, {
        amount: normalizedPaid,
        method: payment_method || null,
        notes: payment_notes || null,
      });
    }

    const [created] = await connection.query(
      `
        ${appointmentSelectWithPayments}
        WHERE a.id = ?
        LIMIT 1
      `,
      [appointmentId]
    );
    return created[0] || null;
  } finally {
    connection.release();
  }
}

const orderSelectWithPayments = `
  SELECT
    o.*,
    b.total_amount as total_amount,
    b.total_amount as payment_total,
    COALESCE(p.paid_total, 0) as payment_paid,
    GREATEST(COALESCE(b.total_amount, 0) - COALESCE(p.paid_total, 0), 0) as payment_due,
    CASE
      WHEN f.has_refund = 1 THEN 'refunded'
      WHEN f.has_failed = 1 AND COALESCE(p.paid_total, 0) = 0 THEN 'failed'
      WHEN b.total_amount IS NULL THEN 'pending'
      WHEN COALESCE(p.paid_total, 0) <= 0 THEN 'pending'
      WHEN COALESCE(p.paid_total, 0) < b.total_amount THEN 'pending'
      ELSE 'paid'
    END as payment_status,
    lp.method as payment_method,
    b.notes as payment_notes
  FROM orders o
  LEFT JOIN order_billing b ON b.order_id = o.id
  LEFT JOIN (
    SELECT order_id, COALESCE(SUM(amount), 0) as paid_total
    FROM order_payments
    WHERE status = 'paid'
    GROUP BY order_id
  ) p ON p.order_id = o.id
  LEFT JOIN (
    SELECT order_id,
           MAX(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as has_failed,
           MAX(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as has_refund
    FROM order_payments
    GROUP BY order_id
  ) f ON f.order_id = o.id
  LEFT JOIN (
    SELECT DISTINCT ON (order_id)
      order_id, method, notes, paid_at
    FROM order_payments
    WHERE status = 'paid'
    ORDER BY order_id, paid_at DESC NULLS LAST, id DESC
  ) lp ON lp.order_id = o.id
`;

export async function getOrders(
  adminId = null,
  { limit = 200, offset = 0 } = {}
) {
  const connection = await getConnection();
  try {
    const params = [];
    const whereParts = [];
    if (adminId) {
      whereParts.push('o.admin_id = ?');
      params.push(adminId);
    }
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const [rows] = await connection.query(
      `
        ${orderSelectWithPayments}
        ${whereClause}
        ORDER BY COALESCE(o.placed_at, o.created_at) DESC, o.id DESC
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

export async function countOrdersSince(adminId = null, since = null) {
  const connection = await getConnection();
  try {
    const params = [];
    const whereParts = [];
    if (adminId) {
      whereParts.push('o.admin_id = ?');
      params.push(adminId);
    }
    if (since) {
      whereParts.push('COALESCE(o.placed_at, o.created_at) > ?');
      params.push(since);
    }
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const [rows] = await connection.query(
      `
        SELECT COUNT(*) as count
        FROM orders o
        ${whereClause}
      `,
      params
    );
    return Number(rows?.[0]?.count || 0);
  } finally {
    connection.release();
  }
}

const upsertOrderBilling = async (
  connection,
  orderId,
  { total_amount, currency, notes }
) => {
  const [rows] = await connection.query(
    `
      INSERT INTO order_billing (order_id, total_amount, currency, notes)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (order_id) DO UPDATE
      SET total_amount = EXCLUDED.total_amount,
          currency = COALESCE(EXCLUDED.currency, order_billing.currency),
          notes = COALESCE(EXCLUDED.notes, order_billing.notes),
          updated_at = NOW()
      RETURNING order_id
    `,
    [orderId, total_amount, currency || null, notes || null]
  );
  return rows[0] || null;
};

const deleteManualOrderPayments = async (connection, orderId) => {
  await connection.query(
    `DELETE FROM order_payments WHERE order_id = ? AND source = 'manual'`,
    [orderId]
  );
};

const insertManualOrderPayment = async (
  connection,
  orderId,
  { amount, method, status, notes }
) => {
  const [rows] = await connection.query(
    `
      INSERT INTO order_payments
        (order_id, amount, method, status, source, notes, paid_at)
      VALUES (?, ?, ?, ?, 'manual', ?, NOW())
      RETURNING id
    `,
    [orderId, amount, method || null, status || 'paid', notes || null]
  );
  return rows[0] || null;
};

const computeItemsTotal = (items) => {
  if (!Array.isArray(items)) return null;
  const total = items.reduce(
    (sum, item) => sum + Number(item?.price || 0) * Number(item?.quantity || 0),
    0
  );
  return Number.isFinite(total) ? total : null;
};

export async function updateOrder(orderId, updates = {}, adminId = null) {
  const connection = await getConnection();
  try {
    const fields = [];
    const params = [];

    if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
      fields.push('status = ?');
      params.push(updates.status);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'fulfillment_status')) {
      fields.push('fulfillment_status = ?');
      params.push(updates.fulfillment_status);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'assigned_to')) {
      fields.push('assigned_to = ?');
      params.push(updates.assigned_to || null);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'notes')) {
      fields.push('notes = ?');
      params.push(
        Array.isArray(updates.notes) || updates.notes === null
          ? updates.notes
          : null
      );
    }

    const hasBillingUpdate =
      Object.prototype.hasOwnProperty.call(updates, 'payment_total') ||
      Object.prototype.hasOwnProperty.call(updates, 'payment_notes');
    const hasPaymentUpdate =
      Object.prototype.hasOwnProperty.call(updates, 'payment_paid') ||
      Object.prototype.hasOwnProperty.call(updates, 'payment_method') ||
      Object.prototype.hasOwnProperty.call(updates, 'payment_status');

    if (fields.length > 0) {
      params.push(orderId);
      if (adminId) {
        params.push(adminId);
      }

      if (adminId) {
        await connection.query(
          `UPDATE orders o
           SET ${fields.join(', ')}
           WHERE o.id = ? AND o.admin_id = ?`,
          params
        );
      } else {
        await connection.query(
          `UPDATE orders
           SET ${fields.join(', ')}
           WHERE id = ?`,
          params
        );
      }
    }

    const normalizedTotal = normalizeAmount(updates.payment_total);
    const normalizedPaid = normalizeAmount(updates.payment_paid);

    if (hasBillingUpdate) {
      await upsertOrderBilling(connection, orderId, {
        total_amount: normalizedTotal,
        currency: updates.payment_currency || null,
        notes: updates.payment_notes || null,
      });
    }

    if (hasPaymentUpdate) {
      const paymentStatus = updates.payment_status || null;
      if (paymentStatus === 'pending') {
        await deleteManualOrderPayments(connection, orderId);
      } else {
        let amount = normalizedPaid;
        let status = paymentStatus || 'paid';

        if (paymentStatus && (paymentStatus === 'paid' || paymentStatus === 'refunded')) {
          const [billingRows] = await connection.query(
            `SELECT total_amount FROM order_billing WHERE order_id = ? LIMIT 1`,
            [orderId]
          );
          let total = billingRows?.[0]?.total_amount;
          if (!Number.isFinite(Number(total))) {
            const [orderRows] = await connection.query(
              `SELECT items FROM orders WHERE id = ? LIMIT 1`,
              [orderId]
            );
            total = computeItemsTotal(orderRows?.[0]?.items);
            if (Number.isFinite(Number(total))) {
              await upsertOrderBilling(connection, orderId, {
                total_amount: total,
                currency: updates.payment_currency || null,
                notes: updates.payment_notes || null,
              });
            }
          }
          if (Number.isFinite(Number(total))) {
            amount = Number(total);
          }
        }

        await deleteManualOrderPayments(connection, orderId);
        if (Number.isFinite(amount) && amount > 0) {
          await insertManualOrderPayment(connection, orderId, {
            amount,
            method: updates.payment_method || null,
            status,
            notes: updates.payment_notes || null,
          });
        } else if (paymentStatus === 'failed' || paymentStatus === 'refunded') {
          await insertManualOrderPayment(connection, orderId, {
            amount: 0,
            method: updates.payment_method || null,
            status,
            notes: updates.payment_notes || null,
          });
        }
      }
    }

    if (fields.length === 0 && !hasBillingUpdate && !hasPaymentUpdate) {
      return null;
    }

    const fetchParams = [orderId];
    let whereClause = 'WHERE o.id = ?';
    if (adminId) {
      whereClause += ' AND o.admin_id = ?';
      fetchParams.push(adminId);
    }
    const [rows] = await connection.query(
      `
        ${orderSelectWithPayments}
        ${whereClause}
        LIMIT 1
      `,
      fetchParams
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
        FROM tasks n
        LEFT JOIN contacts u ON n.user_id = u.id
        LEFT JOIN admins a ON n.assigned_to = a.id
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
        INSERT INTO contacts (phone, name, email, assigned_admin_id)
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
        INSERT INTO contact_messages (user_id, admin_id, message_text, message_type, status)
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
          (SELECT COUNT(*) FROM contacts) as total_users,
          (SELECT COUNT(*) FROM contact_messages WHERE message_type = 'incoming') as incoming_messages,
          (SELECT COUNT(*) FROM requirements WHERE status = 'in_progress') as active_requirements,
          (SELECT COUNT(*) FROM tasks WHERE status = 'open') as open_needs
      `);
      return stats[0];
    }

    const [stats] = await connection.query(
      `
        SELECT
          (SELECT COUNT(*) FROM contacts WHERE assigned_admin_id = ?) as total_users,
          (SELECT COUNT(*) FROM contact_messages WHERE message_type = 'incoming' AND admin_id = ?) as incoming_messages,
          (SELECT COUNT(*)
           FROM requirements r
           JOIN contacts u ON r.user_id = u.id
           WHERE r.status = 'in_progress' AND u.assigned_admin_id = ?) as active_requirements,
          (SELECT COUNT(*)
           FROM tasks n
           JOIN contacts u ON n.user_id = u.id
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
              profession, profession_request, profession_requested_at,
              whatsapp_number, whatsapp_name, whatsapp_connected_at,
              ai_enabled, ai_prompt, ai_blocklist,
              created_at, updated_at
       FROM admins
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
      `SELECT id, name, email, phone, admin_tier, status, profession,
              profession_request, profession_requested_at,
              created_at, updated_at
       FROM admins
       ORDER BY created_at DESC`
    );
    return rows;
  } finally {
    connection.release();
  }
}

export async function updateAdminAccess(adminId, { admin_tier, status, profession } = {}) {
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
    if (typeof profession === 'string') {
      updates.push('profession = ?');
      updates.push('profession_request = NULL');
      updates.push('profession_requested_at = NULL');
      values.push(profession);
    }
    if (updates.length === 0) {
      const [rows] = await connection.query(
        `SELECT id, name, email, phone, admin_tier, status,
                profession, profession_request, profession_requested_at,
                created_at, updated_at
         FROM admins
         WHERE id = ?
         LIMIT 1`,
        [adminId]
      );
      return rows[0] || null;
    }
    values.push(adminId);
    await connection.query(
      `UPDATE admins SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    const [rows] = await connection.query(
      `SELECT id, name, email, phone, admin_tier, status,
              profession, profession_request, profession_requested_at,
              created_at, updated_at
       FROM admins
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
       FROM admins
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
      `UPDATE admins SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return await getAdminAISettings(adminId);
  } finally {
    connection.release();
  }
}

export async function updateAdminProfile(adminId, { name, email, profession }) {
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
    if (typeof profession === 'string') {
      updates.push('profession = ?');
      updates.push('profession_request = NULL');
      updates.push('profession_requested_at = NULL');
      values.push(profession);
    }
    if (updates.length === 0) {
      return await getAdminById(adminId);
    }
    values.push(adminId);
    await connection.query(
      `UPDATE admins SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return await getAdminById(adminId);
  } finally {
    connection.release();
  }
}

export async function requestAdminProfession(adminId, profession) {
  const connection = await getConnection();
  try {
    await connection.query(
      `UPDATE admins
       SET profession_request = ?, profession_requested_at = NOW()
       WHERE id = ?`,
      [profession, adminId]
    );
    return await getAdminById(adminId);
  } finally {
    connection.release();
  }
}

export async function getLatestRequirementForUser(userId, adminId = null) {
  const connection = await getConnection();
  try {
    const params = [userId];
    let whereClause = 'WHERE r.user_id = ?';
    if (adminId) {
      whereClause += ' AND u.assigned_admin_id = ?';
      params.push(adminId);
    }
    const [rows] = await connection.query(
      `
        SELECT r.*
        FROM requirements r
        LEFT JOIN contacts u ON r.user_id = u.id
        ${whereClause}
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT 1
      `,
      params
    );
    return rows[0] || null;
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
        LEFT JOIN admins a ON b.created_by = a.id
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
       LEFT JOIN admins a ON b.created_by = a.id
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
        FROM templates t
        LEFT JOIN admins a ON t.created_by = a.id
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
       FROM templates t
       LEFT JOIN admins a ON t.created_by = a.id
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
      `INSERT INTO templates (name, category, content, variables_json, created_by)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id`,
      [name, category, content, variablesJson, createdBy || null]
    );
    return await getTemplateById(rows[0]?.id);
  } finally {
    connection.release();
  }
}

const parseCatalogKeywords = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || '').trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;\n]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const serializeCatalogKeywords = (value) => {
  const keywords = parseCatalogKeywords(value);
  return keywords.length ? keywords.join(', ') : null;
};

export async function getCatalogItems(
  adminId,
  { type = 'all', status = 'all', search = '', limit = 200, offset = 0 } = {}
) {
  const connection = await getConnection();
  try {
    const params = [adminId];
    const whereParts = ['admin_id = ?'];
    if (type && type !== 'all') {
      whereParts.push('item_type = ?');
      params.push(type);
    }
    if (status && status !== 'all') {
      whereParts.push('is_active = ?');
      params.push(status === 'active');
    }
    if (search) {
      const q = `%${search.toLowerCase()}%`;
      whereParts.push(
        '(LOWER(name) LIKE ? OR LOWER(category) LIKE ? OR LOWER(description) LIKE ?)'
      );
      params.push(q, q, q);
    }
    const whereClause = `WHERE ${whereParts.join(' AND ')}`;
    const [rows] = await connection.query(
      `
        SELECT *
        FROM services_products
        ${whereClause}
        ORDER BY sort_order ASC, name ASC, id ASC
        LIMIT ?
        OFFSET ?
      `,
      [...params, limit, offset]
    );
    return rows.map((row) => ({
      ...row,
      keywords: parseCatalogKeywords(row.keywords),
    }));
  } finally {
    connection.release();
  }
}

export async function getCatalogItemById(itemId, adminId) {
  const connection = await getConnection();
  try {
    const params = [itemId];
    let whereClause = 'WHERE id = ?';
    if (adminId) {
      whereClause += ' AND admin_id = ?';
      params.push(adminId);
    }
    const [rows] = await connection.query(
      `
        SELECT *
        FROM services_products
        ${whereClause}
        LIMIT 1
      `,
      params
    );
    const row = rows[0];
    if (!row) return null;
    return { ...row, keywords: parseCatalogKeywords(row.keywords) };
  } finally {
    connection.release();
  }
}

export async function createCatalogItem({
  adminId,
  item_type,
  name,
  category,
  description,
  price_label,
  duration_minutes,
  details_prompt,
  keywords,
  is_active,
  sort_order,
  is_bookable,
}) {
  const connection = await getConnection();
  try {
    const keywordsValue = serializeCatalogKeywords(keywords);
    const [rows] = await connection.query(
      `INSERT INTO services_products
       (admin_id, item_type, name, category, description, price_label, duration_minutes, details_prompt, keywords, is_active, sort_order, is_bookable)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        adminId,
        item_type,
        name,
        category || null,
        description || null,
        price_label || null,
        Number.isFinite(duration_minutes) ? duration_minutes : null,
        details_prompt || null,
        keywordsValue,
        typeof is_active === 'boolean' ? is_active : true,
        Number.isFinite(sort_order) ? sort_order : 0,
        typeof is_bookable === 'boolean' ? is_bookable : false,
      ]
    );
    return await getCatalogItemById(rows[0]?.id, adminId);
  } finally {
    connection.release();
  }
}

export async function updateCatalogItem(itemId, adminId, updates = {}) {
  const connection = await getConnection();
  try {
    const fields = [];
    const params = [];

    if (Object.prototype.hasOwnProperty.call(updates, 'item_type')) {
      fields.push('item_type = ?');
      params.push(updates.item_type);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
      fields.push('name = ?');
      params.push(updates.name);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'category')) {
      fields.push('category = ?');
      params.push(updates.category || null);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
      fields.push('description = ?');
      params.push(updates.description || null);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'price_label')) {
      fields.push('price_label = ?');
      params.push(updates.price_label || null);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'duration_minutes')) {
      const duration = updates.duration_minutes;
      fields.push('duration_minutes = ?');
      params.push(Number.isFinite(duration) ? duration : null);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'details_prompt')) {
      fields.push('details_prompt = ?');
      params.push(updates.details_prompt || null);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'keywords')) {
      fields.push('keywords = ?');
      params.push(serializeCatalogKeywords(updates.keywords));
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'is_active')) {
      fields.push('is_active = ?');
      params.push(Boolean(updates.is_active));
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'sort_order')) {
      const order = updates.sort_order;
      fields.push('sort_order = ?');
      params.push(Number.isFinite(order) ? order : 0);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'is_bookable')) {
      fields.push('is_bookable = ?');
      params.push(Boolean(updates.is_bookable));
    }

    if (fields.length === 0) {
      return await getCatalogItemById(itemId, adminId);
    }

    fields.push('updated_at = NOW()');
    params.push(itemId, adminId);

    await connection.query(
      `UPDATE services_products
       SET ${fields.join(', ')}
       WHERE id = ? AND admin_id = ?`,
      params
    );
    return await getCatalogItemById(itemId, adminId);
  } finally {
    connection.release();
  }
}

export async function deleteCatalogItem(itemId, adminId) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query(
      `DELETE FROM services_products
       WHERE id = ? AND admin_id = ?
       RETURNING id`,
      [itemId, adminId]
    );
    return rows[0] || null;
  } finally {
    connection.release();
  }
}

export async function getReportOverview(startDate, adminId = null) {
  const connection = await getConnection();
  try {
    const messageParams = [startDate];
    let messageWhere = "WHERE created_at >= ? AND message_type = 'incoming'";
    if (adminId) {
      messageWhere += ' AND admin_id = ?';
      messageParams.push(adminId);
    }
    const [messageStats] = await connection.query(
      `
        SELECT date_trunc('day', created_at) as date, COUNT(*) as count
        FROM contact_messages
        ${messageWhere}
        GROUP BY date_trunc('day', created_at)
        ORDER BY date_trunc('day', created_at)
      `,
      messageParams
    );

    const totalParams = [];
    let totalWhere = "WHERE message_type = 'incoming'";
    if (adminId) {
      totalWhere += ' AND admin_id = ?';
      totalParams.push(adminId);
    }
    const [totalRows] = await connection.query(
      `
        SELECT COUNT(*) as count
        FROM contact_messages
        ${totalWhere}
      `,
      totalParams
    );
    const totalMessages = Number(totalRows?.[0]?.count || 0);

    if (adminId) {
      const [leadStats] = await connection.query(
        `
          SELECT r.status, COUNT(*) as count
          FROM requirements r
          JOIN contacts u ON r.user_id = u.id
          WHERE u.assigned_admin_id = ?
          GROUP BY r.status
        `,
        [adminId]
      );
      const [contactRows] = await connection.query(
        `
          SELECT COUNT(*) as count
          FROM contacts
          WHERE assigned_admin_id = ?
        `,
        [adminId]
      );
      const totalContacts = Number(contactRows?.[0]?.count || 0);

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
          FROM admins a
          LEFT JOIN contact_messages m ON m.admin_id = a.id
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
        totalMessages,
        leadStats,
        totalContacts,
        agentPerformance,
        topCampaigns,
        revenueSources: [],
      };
    }

    const [leadStats] = await connection.query(
      `
        SELECT status, COUNT(*) as count
        FROM requirements
        GROUP BY status
      `
    );
    const [contactRows] = await connection.query(
      `
        SELECT COUNT(*) as count
        FROM contacts
      `
    );
    const totalContacts = Number(contactRows?.[0]?.count || 0);

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
      FROM admins a
      LEFT JOIN contact_messages m ON m.admin_id = a.id
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
      totalMessages,
      leadStats,
      totalContacts,
      agentPerformance,
      topCampaigns,
      revenueSources: [],
    };
  } finally {
    connection.release();
  }
}
