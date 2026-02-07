// This file configures the initialization of Sentry on the server (Node.js).
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_APP_VERSION,

    // No performance monitoring
    tracesSampleRate: 0,

    // PII filtering: strip personal/financial data before sending
    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }

      if (event.request) {
        delete event.request.data;
      }

      return event;
    },

    beforeBreadcrumb(breadcrumb) {
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
