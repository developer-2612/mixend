# Security Audit Report

- Date: 2026-02-27
- Project: `client-mixend (Copy)`
- Auditor: Codex (automated + manual review)

## Scope and test method

I ran:
- Build/runtime checks: `npm run build`, `npm run lint`, `npm audit --omit=dev`
- Static review of API/auth/backend routes and DB helpers
- Live endpoint probing against local servers (`next start` and `backend:start`) using `curl` and `socket.io-client`

## Environment constraints

- `npm audit` could not complete because of DNS/network failure to npm registry (`EAI_AGAIN registry.npmjs.org`).
- Lint script failed due script/config issue (`next lint` path resolution in this environment).

## Findings (ordered by severity)

### 1) Critical: Backend WhatsApp control APIs are unauthenticated

- Files:
  - `src/server.js:84-138`
  - `src/server.js:172-207`
- Issue:
  - Endpoints `/whatsapp/status`, `/whatsapp/start`, `/whatsapp/disconnect`, `/whatsapp/send` do not validate any auth token/user.
  - Socket.IO connection also trusts `adminId` from query and joins `admin:${adminId}` directly.
- Impact:
  - Any internet caller can start/stop sessions, pull QR login payloads, and interfere with WhatsApp operations.
- Live evidence:
  - `POST /whatsapp/start` without auth returned `200` and QR payload.
  - WebSocket connect without auth received `whatsapp:status` for arbitrary `adminId`.
- Fix:
  - Add backend JWT middleware for all WhatsApp routes and socket handshake.
  - Verify token subject (`id`) matches requested `adminId` (or super-admin role).
  - Reject unauthenticated connections with `401`.

### 2) High: Cross-tenant messaging risk (IDOR) in `sendAdminMessage`

- File:
  - `src/whatsapp.js:1460-1516`
- Issue:
  - Query uses `SELECT id, phone FROM contacts WHERE id = ?` only.
  - No check that `userId` belongs to `adminId`.
- Impact:
  - Caller controlling any connected `adminId` can send messages to any contact row by ID.
- Fix:
  - Enforce ownership in query: `WHERE id = ? AND assigned_admin_id = ?` (unless super-admin path explicitly allowed).
  - Add role-based check before send.

### 3) High: Forgot-password response leaks account state

- File:
  - `app/api/auth/forgot-password/route.js:61-73`
- Issue:
  - Different responses reveal whether account exists and if a super-admin already has an active reset token.
  - Example responses: `{"success":true}` vs `{"success":true,"message":"A temporary password has already been sent..."}`.
- Impact:
  - Account enumeration and privilege/state discovery for targeted attacks.
- Fix:
  - Return the same generic response for all cases (always `200` + generic message).
  - Log details server-side only.

### 4) Medium: Missing rate limiting on auth-sensitive endpoints

- Files:
  - `app/api/auth/login/route.js`
  - `app/api/auth/forgot-password/route.js`
  - `app/api/auth/reset-password/route.js`
  - `app/api/auth/signup/route.js`
- Issue:
  - No IP/account throttling or temporary lockouts.
- Live evidence:
  - 6 rapid invalid login attempts all returned immediately with no slow-down/block.
- Impact:
  - Brute-force, OTP flooding, reset abuse, resource exhaustion.
- Fix:
  - Add per-IP + per-identifier limits (token bucket/sliding window) and exponential backoff.
  - Add CAPTCHA/turnstile for signup and reset request endpoints.

### 5) Medium: Unbounded profile photo upload can exhaust disk/memory

- File:
  - `app/api/profile/photo/route.js:33-59`
- Issue:
  - No file size limit before loading `arrayBuffer()` and writing to disk.
  - MIME trust is based on client-provided `file.type`.
- Impact:
  - DoS via oversized uploads and potential storage abuse.
- Fix:
  - Enforce strict max size (e.g., 1-2MB) before buffering.
  - Validate binary magic bytes for JPEG/PNG/WebP.
  - Add upload rate limits.

### 6) Medium: Internal error messages exposed to clients

- Files:
  - Many routes return `error.message` directly, e.g.:
    - `app/api/users/route.js:34,75`
    - `app/api/orders/route.js:36`
    - `app/api/dashboard/stats/route.js:26`
    - `app/api/auth/login/route.js:111`
- Issue:
  - Raw backend/DB errors can leak implementation details.
- Impact:
  - Information disclosure that helps attackers craft targeted payloads.
- Fix:
  - Return generic client-safe messages.
  - Log detailed errors server-side with correlation IDs.

### 7) Medium: Unsafe JWT secret fallback

- File:
  - `lib/auth.js:4`
- Issue:
  - Uses hardcoded fallback `algoaura-dev-secret-key-2024` if `JWT_SECRET` missing.
- Impact:
  - Misconfigured deployments become trivially forgeable.
- Fix:
  - Fail fast on boot if `JWT_SECRET` is absent/weak.
  - Remove hardcoded fallback entirely.

### 8) Low/Medium: Missing hardening security headers

- Observed on frontend and backend responses:
  - No `Content-Security-Policy`
  - No `X-Frame-Options` / `frame-ancestors`
  - No `X-Content-Type-Options: nosniff`
  - No strict `Referrer-Policy`
- Impact:
  - Increases blast radius of XSS/clickjacking/content sniffing issues.
- Fix:
  - Add standard hardening headers in Next.js middleware and Express middleware.

### 9) Low: Backend auth token flow is not enforced by backend

- Files:
  - `lib/backend-auth.js:27-34` (frontend requests token)
  - `src/server.js` (no token verification)
- Issue:
  - Frontend sends bearer token, but backend endpoints do not validate it.
- Impact:
  - False sense of security; callers can skip token entirely.
- Fix:
  - Implement JWT verification middleware on Express routes and Socket.IO handshake.

## Additional observations

- Access control on Next API routes is generally good (`requireAuth` used widely).
- SQL parameterization is mostly handled safely via positional placeholders.
- Build succeeds (`npm run build`).

## Priority remediation plan

1. **Immediate (same day)**
   - Protect all backend `/whatsapp/*` routes + socket handshake with JWT auth.
   - Enforce `adminId` ownership checks and super-admin role checks.
   - Patch `sendAdminMessage` to validate contact ownership.

2. **Short term (1-3 days)**
   - Normalize forgot/reset responses to stop account-state leakage.
   - Add rate limiting to login/signup/forgot/reset.
   - Add upload size/type hard limits for profile photos.

3. **Hardening (this week)**
   - Remove JWT secret fallback and enforce required env vars at startup.
   - Replace client-facing raw error messages with generic errors.
   - Add CSP and baseline security headers.

## Commands run (summary)

- `npm run build` -> pass
- `npm run lint` -> failed (`next lint` setup/path issue)
- `npm audit --omit=dev` -> failed (`EAI_AGAIN registry.npmjs.org`)
- `curl` probes on `http://localhost:3100` and `http://localhost:4001`
- `node -e` Socket.IO probe (unauthenticated status event received)

