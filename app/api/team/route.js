import { requireAuth } from '../../../lib/auth-server';
import { getTeamMembers } from '../../../lib/db-helpers';

function mapRole(tier) {
  if (tier === 'super_admin') return 'admin';
  if (tier === 'client_admin') return 'agent';
  return 'agent';
}

export async function GET() {
  try {
    await requireAuth();
    const team = await getTeamMembers();
    const normalized = team.map((member) => ({
      ...member,
      role: mapRole(member.admin_tier),
    }));
    return Response.json({ success: true, data: normalized });
  } catch (error) {
    if (error.status === 401) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
