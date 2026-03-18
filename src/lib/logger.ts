/**
 * Structured server-side logger.
 * Outputs newline-delimited JSON to stdout/stderr — never exposed to the UI.
 *
 * Usage:
 *   const log = createLogger({ action: 'createTrip', userId, tripId });
 *   log.info('trip.created', { title });
 *   log.error('db.insert_failed', { error: err.message });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  traceId?: string;
  userId?: string;
  tripId?: string;
  [key: string]: unknown;
}

function generateTraceId(): string {
  // crypto.randomUUID() is a Node.js 18+ global available in Next.js server context
  return crypto.randomUUID();
}

function emit(level: LogLevel, event: string, ctx: LogContext, data?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...ctx,
    ...data,
  };
  // Strip undefined fields for clean output
  const line = JSON.stringify(entry, (_, v) => (v === undefined ? undefined : v));
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export function createLogger(context: LogContext) {
  const traceId = context.traceId ?? generateTraceId();
  const ctx: LogContext = { traceId, ...context };

  return {
    traceId,
    debug: (event: string, data?: Record<string, unknown>) => emit('debug', event, ctx, data),
    info:  (event: string, data?: Record<string, unknown>) => emit('info',  event, ctx, data),
    warn:  (event: string, data?: Record<string, unknown>) => emit('warn',  event, ctx, data),
    error: (event: string, data?: Record<string, unknown>) => emit('error', event, ctx, data),
  };
}
