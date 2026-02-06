import { getMessagesForUser } from '../../../../../lib/db-helpers';
import { requireAuth } from '../../../../../lib/auth-server';

export async function GET(req, context) {
  try {
    const authUser = await requireAuth();
    const params = await context.params;
    const userId = Number(params?.id);
    if (!Number.isFinite(userId)) {
      return Response.json({ success: false, error: 'Invalid user id' }, { status: 400 });
    }
    const messages = await getMessagesForUser(
      userId,
      authUser.admin_tier === 'super_admin' ? null : authUser.id
    );
    return Response.json({ success: true, data: messages });
  } catch (error) {
    if (error.status === 401) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
