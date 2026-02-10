import { requireAuth } from '../../../../lib/auth-server';
import { updateAppointmentStatus } from '../../../../lib/db-helpers';

const ALLOWED_STATUSES = new Set(['booked', 'completed', 'cancelled']);

export async function PATCH(request, context) {
  try {
    const authUser = await requireAuth();
    const params = await context.params;
    const appointmentId = Number(params?.id);
    if (!Number.isFinite(appointmentId)) {
      return Response.json({ success: false, error: 'Invalid appointment id' }, { status: 400 });
    }

    const body = await request.json();
    const status = String(body?.status || '');
    if (!ALLOWED_STATUSES.has(status)) {
      return Response.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const updated = await updateAppointmentStatus(appointmentId, status, authUser.id);
    if (!updated) {
      return Response.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }

    return Response.json({ success: true, data: updated });
  } catch (error) {
    if (error.status === 401) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
