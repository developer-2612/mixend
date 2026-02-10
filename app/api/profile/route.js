import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/auth-server';
import { signAuthToken } from '../../../lib/auth';
import { getAdminById, updateAdminProfile } from '../../../lib/db-helpers';

export async function GET() {
  try {
    const user = await requireAuth();
    const admin = await getAdminById(user.id);
    if (!admin) {
      const response = NextResponse.json({ success: false, error: 'User not found' }, { status: 401 });
      response.cookies.set({
        name: 'auth_token',
        value: '',
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
        secure: process.env.NODE_ENV === 'production',
      });
      return response;
    }
    return NextResponse.json({ success: true, data: admin });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name : undefined;
    const email = typeof body.email === 'string' ? body.email : undefined;
    const professionRaw = typeof body.profession === 'string' ? body.profession.trim() : undefined;
    const allowedProfessions = new Set([
      'astrology',
      'clinic',
      'restaurant',
      'salon',
      'shop',
    ]);
    const profession =
      user.admin_tier === 'super_admin' &&
      professionRaw &&
      allowedProfessions.has(professionRaw)
        ? professionRaw
        : undefined;

    const admin = await updateAdminProfile(user.id, { name, email, profession });
    if (!admin) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    const token = signAuthToken({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      admin_tier: admin.admin_tier,
      profession: admin.profession,
    });

    const response = NextResponse.json({ success: true, data: admin });
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
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
