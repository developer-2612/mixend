import { requireAuth } from '../../../../lib/auth-server';
import { requestAdminProfession } from '../../../../lib/db-helpers';

const ALLOWED_PROFESSIONS = new Set([
  'astrology',
  'clinic',
  'restaurant',
  'salon',
  'shop',
]);

export async function POST(req) {
  try {
    const user = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const profession = String(body?.profession || '').trim();
    if (!ALLOWED_PROFESSIONS.has(profession)) {
      return Response.json({ success: false, error: 'Invalid profession' }, { status: 400 });
    }

    const updated = await requestAdminProfession(user.id, profession);
    return Response.json({ success: true, data: updated });
  } catch (error) {
    if (error.status === 401) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
