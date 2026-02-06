# Mex-End

Astrology lead management + WhatsApp automation.  
Frontend (Next.js) runs on Vercel, backend (Express + WhatsApp Web) runs on a Node server.

## Features
- Multi-admin WhatsApp sessions (one QR + session per admin).
- Lead capture with services/products flows (Hinglish/Hindi/English).
- Full conversation logging in `messages` table.
- Resume flow after inactivity and partial lead save.

## Tech Stack
- **Frontend:** Next.js, React, TailwindCSS
- **Backend:** Express, Socket.IO, whatsapp-web.js
- **DB:** MySQL

## Project Structure
- `app/` – Next.js frontend (App Router)
- `src/` – Express backend + WhatsApp automation
- `db/` – DB scripts
- `lib/` – DB helpers + auth

## Environment Variables
Create `.env` with:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT.pooler.supabase.com:6543/postgres
# Use Supabase Session Pooler if your server is IPv4-only.

FRONTEND_ORIGIN=http://localhost:3000
FRONTEND_ORIGINS=http://localhost:3000,http://localhost:3001
PORT=3001

# Optional SMTP (for super admin password email)
SMTP_EMAIL=
SMTP_PASSWORD=
```

## Database Setup (Supabase Postgres)
```
npm run setup-db
```

## Backend (WhatsApp + API)
```
npm run backend
```
Backend runs on `http://localhost:3001`.

### WhatsApp Flow (Per Admin)
- Each admin has a separate WhatsApp session.
- QR is shown in **Settings → WhatsApp** in the frontend.
- Backend exposes:
  - `GET /whatsapp/status?adminId=123`
  - `POST /whatsapp/start` `{ "adminId": 123 }`
  - `POST /whatsapp/disconnect` `{ "adminId": 123 }`

## Frontend (Next.js)
```
npm run dev
```
Frontend runs on `http://localhost:3000`.

## Deployment Notes
- **Frontend:** deploy on Vercel (Next.js).
- **Backend:** deploy on your Node server (supports WhatsApp Web).
- Ensure `FRONTEND_ORIGIN` / `FRONTEND_ORIGINS` match the deployed frontend URL.

## Message Logging
Every incoming and outgoing WhatsApp message is saved in the `messages` table once the admin session is active.

## Troubleshooting
- If QR does not appear: check backend logs and socket connection.
- If WhatsApp disconnects: reconnect from Settings and scan QR again.
