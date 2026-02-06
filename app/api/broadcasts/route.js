import { requireAuth } from '../../../lib/auth-server';
import { createBroadcast, getAllBroadcasts } from '../../../lib/db-helpers';

function normalizeSchedule(value) {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes('T')) {
    const [date, time] = trimmed.split('T');
    if (!date || !time) return null;
    const normalizedTime = time.length === 5 ? `${time}:00` : time;
    return `${date} ${normalizedTime}`;
  }
  return trimmed;
}

export async function GET() {
  try {
    await requireAuth();
    const broadcasts = await getAllBroadcasts();
    return Response.json({ success: true, data: broadcasts });
  } catch (error) {
    if (error.status === 401) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const title = String(body?.title || '').trim();
    const message = String(body?.message || '').trim();
    const targetAudience = String(body?.target_audience || body?.targetAudienceType || 'all').trim() || 'all';
    const scheduledAt = normalizeSchedule(body?.scheduled_at);

    if (!title || !message) {
      return Response.json(
        { success: false, error: 'Title and message are required' },
        { status: 400 }
      );
    }

    const status = scheduledAt ? 'scheduled' : 'draft';
    const broadcast = await createBroadcast({
      title,
      message,
      targetAudienceType: targetAudience,
      scheduledAt,
      status,
      createdBy: user.id,
    });

    return Response.json({ success: true, data: broadcast });
  } catch (error) {
    if (error.status === 401) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
