import { NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db-helpers';
import { hashPassword, signAuthToken } from '../../../../lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    const email = (body.email || '').trim() || null;
    const phone = (body.phone || '').trim();
    const password = body.password || '';
    const professionRaw = typeof body.profession === 'string' ? body.profession.trim() : '';
    const allowedProfessions = new Set([
      'astrology',
      'clinic',
      'restaurant',
      'salon',
      'shop',
    ]);
    const profession = allowedProfessions.has(professionRaw) ? professionRaw : 'astrology';
    const desiredTier = body.admin_tier === 'super_admin' ? 'super_admin' : 'client_admin';

    if (!name || !phone || !password) {
      return NextResponse.json(
        { error: 'Name, phone, and password are required' },
        { status: 400 }
      );
    }

    const connection = await getConnection();

    try {
      const [existing] = await connection.execute(
        `SELECT id, phone, email FROM admins WHERE phone = ? OR email = ?`,
        [phone, email]
      );

      if (existing.length > 0) {
        const phoneExists = existing.some((row) => row.phone === phone);
        const emailExists = email
          ? existing.some((row) => row.email === email)
          : false;
        return NextResponse.json(
          {
            error: 'An account with this phone or email already exists',
            fields: {
              phone: phoneExists,
              email: emailExists,
            },
          },
          { status: 409 }
        );
      }

      const [superAdmins] = await connection.execute(
        `SELECT COUNT(*) as count FROM admins WHERE admin_tier = 'super_admin'`
      );
      const hasSuperAdmin = Number(superAdmins[0]?.count || 0) > 0;
      const allowSuperSignup = process.env.ALLOW_SUPER_ADMIN_SIGNUP === 'true';

      let adminTier = 'client_admin';
      if (!hasSuperAdmin) {
        adminTier = 'super_admin';
      } else if (desiredTier === 'super_admin' && allowSuperSignup) {
        adminTier = 'super_admin';
      }

      const passwordHash = hashPassword(password);

      const [rows] = await connection.query(
        `INSERT INTO admins (name, phone, email, password_hash, admin_tier, status, profession)
         VALUES (?, ?, ?, ?, ?, 'active', ?)
         RETURNING id`,
        [name, phone, email, passwordHash, adminTier, profession]
      );
      const insertedId = rows[0]?.id;

      const token = signAuthToken({
        id: insertedId,
        name,
        email,
        phone,
        admin_tier: adminTier,
        profession,
      });

      const response = NextResponse.json({
        user: {
          id: insertedId,
          name,
          email,
          phone,
          admin_tier: adminTier,
          profession,
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
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}
