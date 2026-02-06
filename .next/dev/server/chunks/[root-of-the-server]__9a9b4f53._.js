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
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[externals]/process [external] (process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("process", () => require("process"));

module.exports = mod;
}),
"[externals]/net [external] (net, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("net", () => require("net"));

module.exports = mod;
}),
"[externals]/tls [external] (tls, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("tls", () => require("tls"));

module.exports = mod;
}),
"[externals]/timers [external] (timers, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("timers", () => require("timers"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/buffer [external] (buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("buffer", () => require("buffer"));

module.exports = mod;
}),
"[externals]/string_decoder [external] (string_decoder, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("string_decoder", () => require("string_decoder"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[project]/lib/db.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getConnection",
    ()=>getConnection,
    "getPool",
    ()=>getPool
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mysql2$2f$promise$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/mysql2/promise.js [app-route] (ecmascript)");
;
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'client_handle',
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
let pool;
function getPool() {
    if (!pool) {
        pool = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mysql2$2f$promise$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].createPool(dbConfig);
    }
    return pool;
}
async function getConnection() {
    return await getPool().getConnection();
}
}),
"[project]/lib/db-helpers.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

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
;
async function getAllUsers() {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [users] = await connection.query(`
      SELECT u.*, a.name as admin_name 
      FROM users u 
      LEFT JOIN admin_accounts a ON u.assigned_admin_id = a.id
      ORDER BY u.created_at DESC
    `);
        return users;
    } finally{
        connection.release();
    }
}
async function getUserById(userId) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [user] = await connection.query(`
      SELECT u.*, a.name as admin_name 
      FROM users u 
      LEFT JOIN admin_accounts a ON u.assigned_admin_id = a.id
      WHERE u.id = ?
    `, [
            userId
        ]);
        return user[0];
    } finally{
        connection.release();
    }
}
async function getAllMessages() {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [messages] = await connection.query(`
      SELECT m.*, u.name as user_name, u.phone, a.name as admin_name 
      FROM messages m 
      LEFT JOIN users u ON m.user_id = u.id 
      LEFT JOIN admin_accounts a ON m.admin_id = a.id
      ORDER BY m.created_at DESC
    `);
        return messages;
    } finally{
        connection.release();
    }
}
async function getMessagesForUser(userId) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [messages] = await connection.query(`
      SELECT m.*, u.name as user_name, a.name as admin_name 
      FROM messages m 
      LEFT JOIN users u ON m.user_id = u.id 
      LEFT JOIN admin_accounts a ON m.admin_id = a.id
      WHERE m.user_id = ?
      ORDER BY m.created_at DESC
    `, [
            userId
        ]);
        return messages;
    } finally{
        connection.release();
    }
}
async function getAllRequirements() {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [requirements] = await connection.query(`
      SELECT r.*, u.name, u.phone 
      FROM user_requirements r 
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `);
        return requirements;
    } finally{
        connection.release();
    }
}
async function updateRequirementStatus(requirementId, status) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        await connection.query(`UPDATE user_requirements SET status = ? WHERE id = ?`, [
            status,
            requirementId
        ]);
        const [rows] = await connection.query(`SELECT r.*, u.name, u.phone 
       FROM user_requirements r 
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = ?
       LIMIT 1`, [
            requirementId
        ]);
        return rows[0] || null;
    } finally{
        connection.release();
    }
}
async function getAllNeeds() {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [needs] = await connection.query(`
      SELECT n.*, u.name, u.phone, a.name as assigned_admin_name 
      FROM user_needs n 
      LEFT JOIN users u ON n.user_id = u.id 
      LEFT JOIN admin_accounts a ON n.assigned_to = a.id
      ORDER BY n.created_at DESC
    `);
        return needs;
    } finally{
        connection.release();
    }
}
async function addUser(phone, name, email, assigned_admin_id) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [result] = await connection.query(`
      INSERT INTO users (phone, name, email, assigned_admin_id) 
      VALUES (?, ?, ?, ?)
    `, [
            phone,
            name,
            email,
            assigned_admin_id
        ]);
        return result.insertId;
    } finally{
        connection.release();
    }
}
async function addMessage(user_id, admin_id, message_text, message_type) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [result] = await connection.query(`
      INSERT INTO messages (user_id, admin_id, message_text, message_type, status) 
      VALUES (?, ?, ?, ?, 'sent')
    `, [
            user_id,
            admin_id,
            message_text,
            message_type
        ]);
        return result.insertId;
    } finally{
        connection.release();
    }
}
async function getDashboardStats() {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [stats] = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM messages WHERE message_type = 'incoming') as incoming_messages,
        (SELECT COUNT(*) FROM user_requirements WHERE status = 'in_progress') as active_requirements,
        (SELECT COUNT(*) FROM user_needs WHERE status = 'open') as open_needs
    `);
        return stats[0];
    } finally{
        connection.release();
    }
}
async function getAdminById(adminId) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [rows] = await connection.query(`SELECT id, name, email, phone, admin_tier, status, created_at, updated_at
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
async function getAllBroadcasts() {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [rows] = await connection.query(`
      SELECT b.*, a.name as created_by_name
      FROM broadcasts b
      LEFT JOIN admin_accounts a ON b.created_by = a.id
      ORDER BY b.created_at DESC
    `);
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
        const [result] = await connection.query(`INSERT INTO broadcasts
       (title, message, target_audience_type, scheduled_at, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`, [
            title,
            message,
            targetAudienceType || 'all',
            scheduledAt || null,
            status || 'draft',
            createdBy || null
        ]);
        return await getBroadcastById(result.insertId);
    } finally{
        connection.release();
    }
}
async function getAllTemplates() {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [rows] = await connection.query(`
      SELECT t.*, a.name as created_by_name
      FROM message_templates t
      LEFT JOIN admin_accounts a ON t.created_by = a.id
      ORDER BY t.created_at DESC
    `);
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
        const [result] = await connection.query(`INSERT INTO message_templates (name, category, content, variables_json, created_by)
       VALUES (?, ?, ?, ?, ?)`, [
            name,
            category,
            content,
            variablesJson,
            createdBy || null
        ]);
        return await getTemplateById(result.insertId);
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
          WHEN m.created_at >= (NOW() - INTERVAL 7 DAY) THEN m.user_id
          ELSE NULL
        END) AS active_chats
      FROM admin_accounts a
      LEFT JOIN messages m ON m.admin_id = a.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);
        return rows;
    } finally{
        connection.release();
    }
}
async function getReportOverview(startDate) {
    const connection = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConnection"])();
    try {
        const [messageStats] = await connection.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM messages
        WHERE created_at >= ?
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `, [
            startDate
        ]);
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
            revenueSources: []
        };
    } finally{
        connection.release();
    }
}
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

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

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2d$helpers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db-helpers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2d$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth-server.js [app-route] (ecmascript)");
;
;
async function GET(req) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2d$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireAuth"])();
        const stats = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2d$helpers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDashboardStats"])();
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
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__9a9b4f53._.js.map