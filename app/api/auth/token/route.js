import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth-server';
import { signAuthToken } from '../../../../lib/auth';
import { consumeRateLimit, getRateLimitHeaders } from '../../../../lib/rate-limit';

const BACKEND_TOKEN_TTL_SECONDS = 10 * 60;

export async function GET() {
  try {
    const user = await requireAuth();
    const rateCheck = consumeRateLimit({
      storeKey: 'auth-backend-token',
      key: String(user.id),
      limit: 120,
      windowMs: 60 * 1000,
      blockMs: 5 * 60 * 1000,
    });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many token requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateCheck) }
      );
    }

    const expiresAt = Date.now() + BACKEND_TOKEN_TTL_SECONDS * 1000;
    const token = signAuthToken(
      {
        id: user.id,
        admin_tier: user.admin_tier,
        scope: 'backend',
      },
      { expiresIn: `${BACKEND_TOKEN_TTL_SECONDS}s` }
    );

    const response = NextResponse.json({ token, expiresAt });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    const status = error?.status === 401 ? 401 : 500;
    const message = status === 401 ? 'Unauthorized' : 'Failed to create token';
    return NextResponse.json({ error: message }, { status });
  }
}
