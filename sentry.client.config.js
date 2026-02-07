// This file configures the initialization of Sentry on the client (browser).
// The config you add here will be used whenever a page is visited.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_APP_VERSION,

    // No performance monitoring — keep it simple
    tracesSampleRate: 0,

    // No session replay
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // PII filtering: strip personal/financial data before sending
    beforeSend(event) {
      // Strip user email — only send UUID
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }

      // Strip request body data (may contain transaction info)
      if (event.request) {
        delete event.request.data;
      }

      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      // Strip transaction descriptions from breadcrumbs (personal spending info)
      if (breadcrumb.data?.description) {
        delete breadcrumb.data.description;
      }
      if (breadcrumb.message?.includes('transaction')) {
        breadcrumb.message = '[filtered]';
      }
      return breadcrumb;
    },
  });
}
