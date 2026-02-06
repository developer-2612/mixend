module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/lib/db.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "getConnection",
    ()=>getConnection,
    "getPool",
    ()=>getPool
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__ = __turbopack_context__.i("[externals]/pg [external] (pg, esm_import, [project]/node_modules/pg)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
const { Pool } = __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__["default"];
let pool;
const formatQuery = (text, params = [])=>{
    if (!params.length) return text;
    let index = 0;
    return text.replace(/\?/g, ()=>`$${++index}`);
};
function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });
    }
    return pool;
}
async function getConnection() {
    const client = await getPool().connect();
    const query = async (text, params = [])=>{
        const sql = formatQuery(text, params);
        const result = await client.query(sql, params);
        return [
            result.rows,
            result
        ];
    };
    return {
        query,
        execute: query,
        release: ()=>client.release()
    };
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/db-helpers.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "addMessage",
    ()=>addMessage,
    "addUser",
    ()=>addUser,
    "createBroadcast",
    ()=>createBroadcast,
    "createTemplate",
    ()=>createTemplate,
    "getAdminById",
    ()=>getAdminById,
    "getAllBroadcasts",
    ()=>getAllBroadcasts,
    "getAllMessages",
    ()=>getAllMessages,
    "getAllNeeds",
    ()=>getAllNeeds,
    "getAllRequirements",
    ()=>getAllRequirements,
    "getAllTemplates",
    ()=>getAllTemplates,
    "getAllUsers",
    ()=>getAllUsers,
    "getBroadcastById",
    ()=>getBroadcastById,
    "getDashboardStats",
    ()=>getDashboardStats,
    "getMessagesForUser",
    ()=>getMessagesForUser,
    "getReportOverview",
    ()=>getReportOverview,
    "getTeamMembers",
    ()=>getTeamMembers,
    "getTemplateById",
    ()=>getTemplateById,
    "getUserById",
    ()=>getUserById,
    "updateAdminProfile",
    ()=>updateAdminProfile,
    "updateRequirementStatus",
    ()=>updateRequirementStatus
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.js [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
async function getAllUsers(adminId = null) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const params = [];
        let whereClause = '';
        if (adminId) {
            whereClause = 'WHERE u.assigned_admin_id = ?';
            params.push(adminId);
        }
        const [users] = await connection.query(`
        SELECT u.*, a.name as admin_name
        FROM users u
        LEFT JOIN admin_accounts a ON u.assigned_admin_id = a.id
        ${whereClause}
        ORDER BY u.created_at DESC
      `, params);
        return users;
    } finally{
        connection.release();
    }
}
async function getUserById(userId, adminId = null) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const params = [
            userId
        ];
        let whereClause = 'WHERE u.id = ?';
        if (adminId) {
            whereClause += ' AND u.assigned_admin_id = ?';
            params.push(adminId);
        }
        const [user] = await connection.query(`
        SELECT u.*, a.name as admin_name
        FROM users u
        LEFT JOIN admin_accounts a ON u.assigned_admin_id = a.id
        ${whereClause}
      `, params);
        return user[0];
    } finally{
        connection.release();
    }
}
async function getAllMessages(adminId = null) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const params = [];
        let whereClause = '';
        if (adminId) {
            whereClause = 'WHERE m.admin_id = ?';
            params.push(adminId);
        }
        const [messages] = await connection.query(`
        SELECT m.*, u.name as user_name, u.phone, a.name as admin_name
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.id
        LEFT JOIN admin_accounts a ON m.admin_id = a.id
        ${whereClause}
        ORDER BY m.created_at DESC
      `, params);
        return messages;
    } finally{
        connection.release();
    }
}
async function getMessagesForUser(userId, adminId = null) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const params = [
            userId
        ];
        let whereClause = 'WHERE m.user_id = ?';
        if (adminId) {
            whereClause += ' AND m.admin_id = ?';
            params.push(adminId);
        }
        const [messages] = await connection.query(`
        SELECT m.*, u.name as user_name, a.name as admin_name
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.id
        LEFT JOIN admin_accounts a ON m.admin_id = a.id
        ${whereClause}
        ORDER BY m.created_at DESC
      `, params);
        return messages;
    } finally{
        connection.release();
    }
}
async function getAllRequirements(adminId = null) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const params = [];
        let whereClause = '';
        if (adminId) {
            whereClause = 'WHERE u.assigned_admin_id = ?';
            params.push(adminId);
        }
        const [requirements] = await connection.query(`
        SELECT r.*, u.name, u.phone
        FROM user_requirements r
        LEFT JOIN users u ON r.user_id = u.id
        ${whereClause}
        ORDER BY r.created_at DESC
      `, params);
        return requirements;
    } finally{
        connection.release();
    }
}
async function updateRequirementStatus(requirementId, status, adminId = null) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        if (adminId) {
            await connection.query(`UPDATE user_requirements r
         SET status = ?
         FROM users u
         WHERE r.user_id = u.id AND r.id = ? AND u.assigned_admin_id = ?`, [
                status,
                requirementId,
                adminId
            ]);
        } else {
            await connection.query(`UPDATE user_requirements SET status = ? WHERE id = ?`, [
                status,
                requirementId
            ]);
        }
        const params = [
            requirementId
        ];
        let whereClause = 'WHERE r.id = ?';
        if (adminId) {
            whereClause += ' AND u.assigned_admin_id = ?';
            params.push(adminId);
        }
        const [rows] = await connection.query(`SELECT r.*, u.name, u.phone
       FROM user_requirements r
       LEFT JOIN users u ON r.user_id = u.id
       ${whereClause}
       LIMIT 1`, params);
        return rows[0] || null;
    } finally{
        connection.release();
    }
}
async function getAllNeeds(adminId = null) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const params = [];
        let whereClause = '';
        if (adminId) {
            whereClause = 'WHERE u.assigned_admin_id = ?';
            params.push(adminId);
        }
        const [needs] = await connection.query(`
        SELECT n.*, u.name, u.phone, a.name as assigned_admin_name
        FROM user_needs n
        LEFT JOIN users u ON n.user_id = u.id
        LEFT JOIN admin_accounts a ON n.assigned_to = a.id
        ${whereClause}
        ORDER BY n.created_at DESC
      `, params);
        return needs;
    } finally{
        connection.release();
    }
}
async function addUser(phone, name, email, assigned_admin_id) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [rows] = await connection.query(`
        INSERT INTO users (phone, name, email, assigned_admin_id)
        VALUES (?, ?, ?, ?)
        RETURNING id
      `, [
            phone,
            name,
            email,
            assigned_admin_id
        ]);
        return rows[0]?.id || null;
    } finally{
        connection.release();
    }
}
async function addMessage(user_id, admin_id, message_text, message_type) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [rows] = await connection.query(`
        INSERT INTO messages (user_id, admin_id, message_text, message_type, status)
        VALUES (?, ?, ?, ?, 'sent')
        RETURNING id
      `, [
            user_id,
            admin_id,
            message_text,
            message_type
        ]);
        return rows[0]?.id || null;
    } finally{
        connection.release();
    }
}
async function getDashboardStats(adminId = null) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
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
        const [stats] = await connection.query(`
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
      `, [
            adminId,
            adminId,
            adminId,
            adminId
        ]);
        return stats[0];
    } finally{
        connection.release();
    }
}
async function getAdminById(adminId) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [rows] = await connection.query(`SELECT id, name, email, phone, admin_tier, status,
              whatsapp_number, whatsapp_name, whatsapp_connected_at,
              created_at, updated_at
       FROM admin_accounts
       WHERE id = ?
       LIMIT 1`, [
            adminId
        ]);
        return rows[0] || null;
    } finally{
        connection.release();
    }
}
async function updateAdminProfile(adminId, { name, email }) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
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
        await connection.query(`UPDATE admin_accounts SET ${updates.join(', ')} WHERE id = ?`, values);
        return await getAdminById(adminId);
    } finally{
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
async function getAllBroadcasts(adminId = null) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const params = [];
        let whereClause = '';
        if (adminId) {
            whereClause = 'WHERE b.created_by = ?';
            params.push(adminId);
        }
        const [rows] = await connection.query(`
        SELECT b.*, a.name as created_by_name
        FROM broadcasts b
        LEFT JOIN admin_accounts a ON b.created_by = a.id
        ${whereClause}
        ORDER BY b.created_at DESC
      `, params);
        return rows;
    } finally{
        connection.release();
    }
}
async function getBroadcastById(broadcastId) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [rows] = await connection.query(`SELECT b.*, a.name as created_by_name
       FROM broadcasts b
       LEFT JOIN admin_accounts a ON b.created_by = a.id
       WHERE b.id = ?
       LIMIT 1`, [
            broadcastId
        ]);
        return rows[0] || null;
    } finally{
        connection.release();
    }
}
async function createBroadcast({ title, message, targetAudienceType, scheduledAt, status, createdBy }) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [rows] = await connection.query(`INSERT INTO broadcasts
       (title, message, target_audience_type, scheduled_at, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING id`, [
            title,
            message,
            targetAudienceType || 'all',
            scheduledAt || null,
            status || 'draft',
            createdBy || null
        ]);
        return await getBroadcastById(rows[0]?.id);
    } finally{
        connection.release();
    }
}
async function getAllTemplates(adminId = null) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const params = [];
        let whereClause = '';
        if (adminId) {
            whereClause = 'WHERE t.created_by = ?';
            params.push(adminId);
        }
        const [rows] = await connection.query(`
        SELECT t.*, a.name as created_by_name
        FROM message_templates t
        LEFT JOIN admin_accounts a ON t.created_by = a.id
        ${whereClause}
        ORDER BY t.created_at DESC
      `, params);
        return rows.map((row)=>({
                ...row,
                variables: parseTemplateVariables(row.variables_json)
            }));
    } finally{
        connection.release();
    }
}
async function getTemplateById(templateId) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [rows] = await connection.query(`SELECT t.*, a.name as created_by_name
       FROM message_templates t
       LEFT JOIN admin_accounts a ON t.created_by = a.id
       WHERE t.id = ?
       LIMIT 1`, [
            templateId
        ]);
        const row = rows[0];
        if (!row) return null;
        return {
            ...row,
            variables: parseTemplateVariables(row.variables_json)
        };
    } finally{
        connection.release();
    }
}
async function createTemplate({ name, category, content, variables, createdBy }) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const variablesJson = Array.isArray(variables) ? JSON.stringify(variables) : null;
        const [rows] = await connection.query(`INSERT INTO message_templates (name, category, content, variables_json, created_by)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id`, [
            name,
            category,
            content,
            variablesJson,
            createdBy || null
        ]);
        return await getTemplateById(rows[0]?.id);
    } finally{
        connection.release();
    }
}
async function getTeamMembers() {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
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
    } finally{
        connection.release();
    }
}
async function getReportOverview(startDate, adminId = null) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const messageParams = [
            startDate
        ];
        let messageWhere = 'WHERE created_at >= ?';
        if (adminId) {
            messageWhere += ' AND admin_id = ?';
            messageParams.push(adminId);
        }
        const [messageStats] = await connection.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM messages
        ${messageWhere}
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `, messageParams);
        if (adminId) {
            const [leadStats] = await connection.query(`
          SELECT r.status, COUNT(*) as count
          FROM user_requirements r
          JOIN users u ON r.user_id = u.id
          WHERE u.assigned_admin_id = ?
          GROUP BY r.status
        `, [
                adminId
            ]);
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
          WHERE a.id = ?
          GROUP BY a.id, a.name, a.admin_tier, a.status
        `, [
                adminId
            ]);
            const [topCampaigns] = await connection.query(`
          SELECT id, title, status, sent_count, delivered_count, created_at
          FROM broadcasts
          WHERE created_by = ?
          ORDER BY sent_count DESC, created_at DESC
          LIMIT 5
        `, [
                adminId
            ]);
            return {
                messageStats,
                leadStats,
                agentPerformance,
                topCampaigns,
                revenueSources: []
            };
        }
        const [leadStats] = await connection.query(`
        SELECT status, COUNT(*) as count
        FROM user_requirements
        GROUP BY status
      `);
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
            revenueSources: []
        };
    } finally{
        connection.release();
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/buffer [external] (buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("buffer", () => require("buffer"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[project]/lib/auth.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "hashPassword",
    ()=>hashPassword,
    "signAuthToken",
    ()=>signAuthToken,
    "verifyAuthToken",
    ()=>verifyAuthToken,
    "verifyPassword",
    ()=>verifyPassword
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jsonwebtoken$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jsonwebtoken/index.js [app-route] (ecmascript)");
;
;
const JWT_SECRET = process.env.JWT_SECRET || 'algoaura-dev-secret-key-2024';
function hashPassword(password) {
    const salt = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomBytes(16).toString('hex');
    const hash = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
}
function verifyPassword(password, storedHash) {
    if (!storedHash) return false;
    const parts = storedHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const salt = parts[1];
    const hash = parts[2];
    try {
        const derived = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].scryptSync(password, salt, 64);
        const stored = Buffer.from(hash, 'hex');
        if (stored.length !== derived.length) return false;
        return __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].timingSafeEqual(stored, derived);
    } catch (err) {
        return false;
    }
}
function signAuthToken(payload) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jsonwebtoken$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].sign(payload, JWT_SECRET, {
        expiresIn: '7d'
    });
}
function verifyAuthToken(token) {
    try {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jsonwebtoken$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}
}),
"[project]/lib/auth-server.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getAuthUser",
    ()=>getAuthUser,
    "requireAuth",
    ()=>requireAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.js [app-route] (ecmascript)");
;
;
async function getAuthUser() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyAuthToken"])(token);
}
async function requireAuth() {
    const user = await getAuthUser();
    if (!user) {
        const error = new Error('Unauthorized');
        error.status = 401;
        throw error;
    }
    return user;
}
}),
"[project]/app/api/dashboard/stats/route.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2d$helpers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db-helpers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2d$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth-server.js [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2d$helpers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2d$helpers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
async function GET(req) {
    try {
        const authUser = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2d$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireAuth"])();
        const stats = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2d$helpers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDashboardStats"])(authUser.admin_tier === 'super_admin' ? null : authUser.id);
        return Response.json({
            success: true,
            data: stats
        });
    } catch (error) {
        if (error.status === 401) {
            return Response.json({
                success: false,
                error: 'Unauthorized'
            }, {
                status: 401
            });
        }
        return Response.json({
            success: false,
            error: error.message
        }, {
            status: 500
        });
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__c314e84d._.js.map