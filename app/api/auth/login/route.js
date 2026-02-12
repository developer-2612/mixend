import { NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db-helpers';
import { signAuthToken, verifyPassword } from '../../../../lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const identifier = (email || '').trim();
    const identifierLower = identifier.toLowerCase();
    const phoneDigits = identifier.replace(/\D/g, '');

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Email or phone and password are required' },
        { status: 400 }
      );
    }

    const connection = await getConnection();

    try {
      const idValue = Number.isFinite(Number(identifier)) ? Number(identifier) : -1;
      const phoneCandidates = Array.from(
        new Set([identifier, phoneDigits].filter(Boolean))
      );
      const phoneClause = phoneCandidates.length
        ? ` OR phone IN (${phoneCandidates.map(() => '?').join(', ')})`
        : '';

      const [users] = await connection.execute(
        `SELECT id, name, email, phone, password_hash, admin_tier, status, profession
         FROM admins
         WHERE LOWER(email) = ?${phoneClause} OR id = ?
         LIMIT 1`,
        [identifierLower, ...phoneCandidates, idValue]
      );

      if (!users || users.length === 0) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      const user = users[0];
      if (user.status !== 'active') {
        return NextResponse.json(
          { error: 'Account is inactive' },
          { status: 403 }
        );
      }

      const isValid = verifyPassword(password, user.password_hash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      const token = signAuthToken({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        admin_tier: user.admin_tier,
        profession: user.profession,
      });

      const response = NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          admin_tier: user.admin_tier,
          profession: user.profession,
        },
      });

      response.cookies.set({
        name: 'auth_token',
        value: token,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        secure: process.env.NODE_ENV === 'production',
      });

      return response;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}
