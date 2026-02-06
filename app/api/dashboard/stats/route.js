import { getDashboardStats } from '../../../../lib/db-helpers';
import { requireAuth } from '../../../../lib/auth-server';

export async function GET(req) {
  try {
    const authUser = await requireAuth();
    const stats = await getDashboardStats(
      authUser.admin_tier === 'super_admin' ? null : authUser.id
    );
    return Response.json({ success: true, data: stats });
  } catch (error) {
    if (error.status === 401) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
