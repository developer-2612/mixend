import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { getConnection } from '../../../../lib/db-helpers';
import { consumeRateLimit, getClientIp, getRateLimitHeaders } from '../../../../lib/rate-limit';

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

const GENERIC_SUCCESS_MESSAGE =
  'If an account exists, a temporary password has been sent to the registered email.';

export async function POST(request) {
  try {
    const body = await request.json();
    const identifier = String(body?.email || body?.identifier || '').trim();
    const clientIp = getClientIp(request);
    const ipLimit = consumeRateLimit({
      storeKey: 'auth-forgot-ip',
      key: clientIp,
      limit: 8,
      windowMs: 15 * 60 * 1000,
      blockMs: 30 * 60 * 1000,
    });
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(ipLimit) }
      );
    }

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
        `SELECT id, name, email, admin_tier, reset_token_hash, reset_expires_at
         FROM admins
         WHERE LOWER(email) = ?${phoneClause} OR id = ?
         LIMIT 1`,
        [identifierLower, ...phoneCandidates, idValue]
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE });
      }

      const user = rows[0];
      if (!user.email) {
        return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE });
      }

      // For super admins, do not issue multiple temp passwords while one is still valid.
      if (user.admin_tier === 'super_admin' && user.reset_token_hash && user.reset_expires_at) {
        const expiresAt = new Date(user.reset_expires_at);
        if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > Date.now()) {
          return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE });
        }
      }

      const transporter = buildTransporter();
      if (!transporter) {
        console.warn('Forgot password requested while SMTP is not configured.');
        return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE });
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

      return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
