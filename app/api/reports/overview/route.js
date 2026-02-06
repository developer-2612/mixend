import { requireAuth } from '../../../../lib/auth-server';
import { getReportOverview } from '../../../../lib/db-helpers';

function resolveRange(range) {
  const now = new Date();
  let days = 7;
  if (range === '30days') days = 30;
  if (range === '90days') days = 90;
  if (range === '1year') days = 365;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start.toISOString().slice(0, 10);
}

export async function GET(request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7days';
    const startDate = resolveRange(range);
    const overview = await getReportOverview(startDate);
    return Response.json({ success: true, data: overview });
  } catch (error) {
    if (error.status === 401) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
