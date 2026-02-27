import crypto from 'crypto';
import jwt from 'jsonwebtoken';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return secret;
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = parts[1];
  const hash = parts[2];
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const stored = Buffer.from(hash, 'hex');
    if (stored.length !== derived.length) return false;
    return crypto.timingSafeEqual(stored, derived);
  } catch (err) {
    return false;
  }
}

export function signAuthToken(payload, options = {}) {
  const expiresIn = options.expiresIn || '7d';
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

export function verifyAuthToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (err) {
    return null;
  }
}
