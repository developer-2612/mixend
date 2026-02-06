import { requireAuth } from '../../../lib/auth-server';
import { createTemplate, getAllTemplates } from '../../../lib/db-helpers';

export async function GET() {
  try {
    await requireAuth();
    const templates = await getAllTemplates();
    return Response.json({ success: true, data: templates });
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
    const name = String(body?.name || '').trim();
    const category = String(body?.category || '').trim();
    const content = String(body?.content || '').trim();
    const variables = Array.isArray(body?.variables) ? body.variables : [];

    if (!name || !category || !content) {
      return Response.json(
        { success: false, error: 'Name, category, and content are required' },
        { status: 400 }
      );
    }

    const template = await createTemplate({
      name,
      category,
      content,
      variables,
      createdBy: user.id,
    });

    return Response.json({ success: true, data: template });
  } catch (error) {
    if (error.status === 401) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
