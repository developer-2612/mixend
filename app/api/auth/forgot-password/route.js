import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { getConnection } from '../../../../lib/db-helpers';

export const runtime = 'nodejs';

const SMTP_EMAIL = process.env.SMTP_EMAIL || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';

function buildTransporter() {
  if (!SMTP_EMAIL || !SMTP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: SMTP_EMAIL,
      pass: SMTP_PASSWORD,
    },
  });
}

function createTempPassword() {
  return crypto.randomBytes(4).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const identifier = String(body?.email || body?.identifier || '').trim();
    if (!identifier) {
      return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 });
    }

    const identifierLower = identifier.toLowerCase();
    const phoneDigits = identifier.replace(/\D/g, '');
    const idValue = Number.isFinite(Number(identifier)) ? Number(identifier) : -1;
    const phoneCandidates = Array.from(new Set([identifier, phoneDigits].filter(Boolean)));
    const phoneClause = phoneCandidates.length
      ? ` OR phone IN (${phoneCandidates.map(() => '?').join(', ')})`
      : '';

    const connection = await getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT id, name, email
         FROM admins
         WHERE LOWER(email) = ?${phoneClause} OR id = ?
         LIMIT 1`,
        [identifierLower, ...phoneCandidates, idValue]
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json({ success: true });
      }

      const user = rows[0];
      if (!user.email) {
        return NextResponse.json({ error: 'No email found for this account' }, { status: 400 });
      }

      const transporter = buildTransporter();
      if (!transporter) {
        return NextResponse.json(
          { error: 'SMTP is not configured. Please set SMTP_EMAIL and SMTP_PASSWORD.' },
          { status: 500 }
        );
      }

      const tempPassword = createTempPassword();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const tokenHash = hashToken(tempPassword);

      await connection.query(
        `UPDATE admins
         SET reset_token_hash = ?, reset_expires_at = ?
         WHERE id = ?`,
        [tokenHash, expiresAt.toISOString(), user.id]
      );

      await transporter.sendMail({
        from: SMTP_EMAIL,
        to: user.email,
        subject: 'AlgoAura Password Reset',
        text: `Your temporary password is: ${tempPassword}\n\nIt will expire in 15 minutes.`,
      });

      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
