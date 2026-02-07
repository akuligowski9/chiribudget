// Next.js instrumentation hook — auto-detected by the framework.
// Initializes Sentry for server-side and edge runtimes.
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = async (...args) => {
  const Sentry = await import('@sentry/nextjs');
  if (typeof Sentry.captureRequestError === 'function') {
    Sentry.captureRequestError(...args);
  }
};
