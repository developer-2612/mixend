const stores = new Map();
const STORE_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

const ensureStore = (name) => {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  return stores.get(name);
};

const toSeconds = (ms) => Math.max(1, Math.ceil(ms / 1000));

const parseForwardedIp = (value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "";
  return String(raw)
    .split(",")[0]
    .trim();
};

export function getClientIp(request) {
  if (!request) return "unknown";

  if (request.headers && typeof request.headers.get === "function") {
    const forwarded = parseForwardedIp(request.headers.get("x-forwarded-for"));
    if (forwarded) return forwarded;
    const real = parseForwardedIp(request.headers.get("x-real-ip"));
    if (real) return real;
  } else if (request.headers) {
    const forwarded = parseForwardedIp(request.headers["x-forwarded-for"]);
    if (forwarded) return forwarded;
    const real = parseForwardedIp(request.headers["x-real-ip"]);
    if (real) return real;
  }

  if (typeof request.ip === "string" && request.ip.trim()) {
    return request.ip.trim();
  }

  return "unknown";
}

export function consumeRateLimit({
  storeKey,
  key,
  limit,
  windowMs,
  blockMs = 0,
}) {
  const safeStoreKey = String(storeKey || "default");
  const safeKey = String(key || "unknown");
  const safeLimit = Math.max(1, Number(limit) || 1);
  const safeWindowMs = Math.max(1_000, Number(windowMs) || 60_000);
  const safeBlockMs = Math.max(0, Number(blockMs) || 0);

  const now = Date.now();
  const store = ensureStore(safeStoreKey);
  const current = store.get(safeKey);

  let entry = current;
  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + safeWindowMs,
      blockedUntil: 0,
    };
  }

  if (entry.blockedUntil && now < entry.blockedUntil) {
    const retryAfterMs = entry.blockedUntil - now;
    return {
      allowed: false,
      limit: safeLimit,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs,
      retryAfterSeconds: toSeconds(retryAfterMs),
    };
  }

  entry.count += 1;
  const overLimit = entry.count > safeLimit;

  if (overLimit) {
    if (safeBlockMs > 0) {
      entry.blockedUntil = now + safeBlockMs;
    }
    store.set(safeKey, entry);
    const retryAfterMs = entry.blockedUntil
      ? entry.blockedUntil - now
      : Math.max(1_000, entry.resetAt - now);
    return {
      allowed: false,
      limit: safeLimit,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs,
      retryAfterSeconds: toSeconds(retryAfterMs),
    };
  }

  store.set(safeKey, entry);
  return {
    allowed: true,
    limit: safeLimit,
    remaining: Math.max(0, safeLimit - entry.count),
    resetAt: entry.resetAt,
    retryAfterMs: 0,
    retryAfterSeconds: 0,
  };
}

export function getRateLimitHeaders(result) {
  const headers = {
    "X-RateLimit-Limit": String(result?.limit || 0),
    "X-RateLimit-Remaining": String(result?.remaining || 0),
  };

  if (!result?.allowed && result?.retryAfterSeconds) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }

  return headers;
}

const cleanupStores = () => {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [key, entry] of store.entries()) {
      if (!entry) {
        store.delete(key);
        continue;
      }
      if (now >= entry.resetAt && (!entry.blockedUntil || now >= entry.blockedUntil)) {
        store.delete(key);
      }
    }
  }
};

const cleanupTimer = setInterval(cleanupStores, STORE_CLEANUP_INTERVAL_MS);
if (cleanupTimer.unref) cleanupTimer.unref();
