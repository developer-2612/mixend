import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../../lib/auth-server';
import { getAdminById } from '../../../../lib/db-helpers';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const admin = await getAdminById(user.id);
  if (!admin) {
    const response = NextResponse.json({ user: null }, { status: 401 });
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

  return NextResponse.json({
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      admin_tier: admin.admin_tier,
      profession: admin.profession,
      profession_request: admin.profession_request,
      profession_requested_at: admin.profession_requested_at,
    },
  });
}
