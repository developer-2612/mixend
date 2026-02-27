# Security Fixes and Optimization Report

- Date: 2026-02-27
- Scope: security vulnerabilities identified in runtime/API/auth review and stability optimizations

## Fixed issues and how each was resolved

### 1) Critical: Unauthenticated WhatsApp control APIs
- Problem:
  - `/whatsapp/status`, `/whatsapp/start`, `/whatsapp/disconnect`, `/whatsapp/send` were callable without auth.
  - Socket.IO clients could subscribe to admin rooms without authentication.
- Fix:
  - Added backend JWT auth middleware with scope enforcement (`scope = backend`).
  - Added admin-scope authorization checks (user can only access their own admin ID unless `super_admin`).
  - Added socket handshake auth + admin scope check.
- Files:
  - `src/server.js`

### 2) High: Cross-tenant send message risk (IDOR)
- Problem:
  - `sendAdminMessage` queried contacts by `id` only.
- Fix:
  - Enforced contact ownership (`id` + `assigned_admin_id`).
  - Added max outgoing message length guard.
- Files:
  - `src/whatsapp.js`

### 3) High: Forgot-password account-state leakage
- Problem:
  - API responses revealed account state (existing account/reset state/super-admin token state).
- Fix:
  - Normalized successful response to a generic message for all valid identifier requests.
  - Removed account-state-specific responses from public output.
- Files:
  - `app/api/auth/forgot-password/route.js`

### 4) Medium: Missing rate limiting on auth-sensitive paths
- Problem:
  - No abuse protection on login, signup, forgot-password, reset-password.
- Fix:
  - Added shared in-memory rate limiter utility.
  - Applied route limits + `429` responses with `Retry-After` and rate-limit headers.
- Files:
  - `lib/rate-limit.js`
  - `app/api/auth/login/route.js`
  - `app/api/auth/signup/route.js`
  - `app/api/auth/forgot-password/route.js`
  - `app/api/auth/reset-password/route.js`
  - `app/api/auth/token/route.js`

### 5) Medium: Unbounded profile photo upload (DoS risk)
- Problem:
  - No file size cap; trusted MIME type only.
- Fix:
  - Added 2MB upload cap (`413` on oversized files).
  - Added binary signature (magic-byte) validation for JPG/PNG/WEBP.
  - Added upload rate limiting.
- Files:
  - `app/api/profile/photo/route.js`

### 6) Medium: Internal error detail leakage
- Problem:
  - Many API routes returned raw `error.message` to clients.
- Fix:
  - Replaced client-facing raw error details with generic server error messages on 500 paths.
- Files:
  - Multiple under `app/api/**/route.js`

### 7) Medium: Unsafe JWT secret fallback
- Problem:
  - JWT signing used a hardcoded fallback secret if `JWT_SECRET` was missing.
- Fix:
  - Removed fallback and enforced required secret at runtime.
- Files:
  - `lib/auth.js`

### 8) Low/Medium: Missing security headers
- Problem:
  - Missing CSP, frame and content-sniff protections.
- Fix:
  - Added security headers globally for Next.js via config headers.
  - Added security headers in Express middleware.
- Files:
  - `next.config.mjs`
  - `src/server.js`

### 9) Low: Frontend token flow existed but backend did not enforce it
- Problem:
  - Frontend generated backend tokens, but backend ignored them.
- Fix:
  - Backend now verifies bearer tokens on REST and WebSocket.
  - Frontend WhatsApp status/socket calls now attach backend bearer token.
  - Server-to-server send-message route now signs and passes backend token.
- Files:
  - `src/server.js`
  - `app/components/layout/Navbar.jsx`
  - `app/settings/page.js`
  - `app/inbox/page.jsx`
  - `app/api/users/[id]/messages/route.js`

## WhatsApp capacity: how many sessions this code handles

Current code capacity is controlled by:
- `WHATSAPP_MAX_SESSIONS` in `src/whatsapp.js`
- Default value: `5`

So, out-of-the-box this backend accepts **5 concurrent WhatsApp admin sessions** per backend process.

You can increase it by setting `WHATSAPP_MAX_SESSIONS`, but real limits depend on RAM/CPU because each session runs a browser client.

## Optimization guidance (applied + recommended)

### Already applied in code
- Session and request abuse controls:
  - route-level rate limits for auth and backend WhatsApp APIs
- Memory/disk safety:
  - upload size cap + file validation for profile photos
- Security hardening:
  - JWT scope enforcement and secure headers

### Recommended next optimization steps
1. Run multiple backend instances behind a load balancer and use sticky sessions for Socket.IO.
2. Enable Redis adapter for Socket.IO (`REDIS_URL`) to scale WebSocket events across instances.
3. Keep `WHATSAPP_MAX_SESSIONS` conservative per instance; scale horizontally first.
4. Monitor per-session memory and CPU, then increase session cap gradually.
5. Add persistent monitoring/alerts for 429 spikes, auth failures, and WhatsApp reconnect loops.

## Verification summary

- Build check passed: `npm run build`
- Backend auth enforcement verified:
  - unauthenticated `/whatsapp/*` requests now return `401`
  - unauthenticated socket clients now get `connect_error Unauthorized`
- Forgot-password behavior verified:
  - generic success response for both existing and non-existing identifiers
- Rate limiting verified:
  - login and forgot-password endpoints now return `429` after threshold

