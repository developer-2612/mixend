import { requireAuth } from '../../../../lib/auth-server';
import { updateAdminAccess } from '../../../../lib/db-helpers';

export const runtime = 'nodejs';

export async function PATCH(req, context) {
  try {
    const user = await requireAuth();
    if (user.admin_tier !== 'super_admin') {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const params = await context.params;
    const adminId = Number(params?.id);
    if (!Number.isFinite(adminId)) {
      return Response.json({ success: false, error: 'Invalid admin id' }, { status: 400 });
    }
    const body = await req.json();
    const admin_tier = body?.admin_tier;
    const status = body?.status;
    const profession = body?.profession;

    const allowedTiers = new Set(['super_admin', 'client_admin']);
    const allowedStatus = new Set(['active', 'inactive']);
    const allowedProfessions = new Set([
      'astrology',
      'clinic',
      'restaurant',
      'salon',
      'shop',
    ]);

    if (admin_tier && !allowedTiers.has(admin_tier)) {
      return Response.json({ success: false, error: 'Invalid admin role' }, { status: 400 });
    }
    if (status && !allowedStatus.has(status)) {
      return Response.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }
    if (profession && !allowedProfessions.has(profession)) {
      return Response.json({ success: false, error: 'Invalid profession' }, { status: 400 });
    }

    if (adminId === user.id) {
      if (status === 'inactive') {
        return Response.json({ success: false, error: 'You cannot deactivate your own account.' }, { status: 400 });
      }
      if (admin_tier && admin_tier !== 'super_admin') {
        return Response.json({ success: false, error: 'You cannot change your own role.' }, { status: 400 });
      }
    }

    const updated = await updateAdminAccess(adminId, { admin_tier, status, profession });
    if (!updated) {
      return Response.json({ success: false, error: 'Admin not found' }, { status: 404 });
    }
    return Response.json({ success: true, data: updated });
  } catch (error) {
    if (error.status === 401) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
