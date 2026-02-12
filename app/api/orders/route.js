import { requireAuth } from '../../../lib/auth-server';
import { parsePagination } from '../../../lib/api-utils';
import { getOrders } from '../../../lib/db-helpers';
import { getDummyOrders } from '../../../lib/orders-dummy';

export async function GET(request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePagination(searchParams, { defaultLimit: 200, maxLimit: 500 });

    let orders = await getOrders(user.id, { limit: limit + 1, offset });
    if (orders.length === 0) {
      const fallback = getDummyOrders(user.id, user.profession);
      const paged = fallback.slice(offset, offset + limit + 1);
      const hasMore = paged.length > limit;
      return Response.json({
        success: true,
        data: hasMore ? paged.slice(0, limit) : paged,
        meta: {
          limit,
          offset,
          hasMore,
          nextOffset: hasMore ? offset + limit : null,
        },
        meta_source: 'dummy',
      });
    }
    const hasMore = orders.length > limit;

    return Response.json({
      success: true,
      data: hasMore ? orders.slice(0, limit) : orders,
      meta: {
        limit,
        offset,
        hasMore,
        nextOffset: hasMore ? offset + limit : null,
      },
    });
  } catch (error) {
    if (error.status === 401) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
