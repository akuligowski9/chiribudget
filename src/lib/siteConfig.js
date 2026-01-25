/**
 * Site configuration for hostname-based behavior
 *
 * Enables single Vercel project to serve multiple domains
 * with different UI behavior based on which URL the user visits.
 */

export const SITE_TYPE = {
  PRODUCTION: 'production',
  DEMO: 'demo',
  LOCAL: 'local',
};

// Hostname to site type mapping
const HOSTNAME_MAP = {
  'chiribudget.vercel.app': SITE_TYPE.PRODUCTION,
  'chiribudgetdemo.vercel.app': SITE_TYPE.DEMO,
  localhost: SITE_TYPE.LOCAL,
};

// Site URLs for cross-site navigation
export const SITE_URLS = {
  [SITE_TYPE.PRODUCTION]: 'https://chiribudget.vercel.app',
  [SITE_TYPE.DEMO]: 'https://chiribudgetdemo.vercel.app',
  [SITE_TYPE.LOCAL]: 'http://localhost:3000',
};

/**
 * Get current site type based on hostname
 * Must be called client-side only
 * @returns {'production' | 'demo' | 'local'}
 */
export function getSiteType() {
  if (typeof window === 'undefined') return SITE_TYPE.PRODUCTION;

  const hostname = window.location.hostname;
  return HOSTNAME_MAP[hostname] || SITE_TYPE.PRODUCTION;
}

/**
 * Check if current site is the demo site
 * @returns {boolean}
 */
export function isDemoSite() {
  return getSiteType() === SITE_TYPE.DEMO;
}

/**
 * Check if current site is production
 * @returns {boolean}
 */
export function isProductionSite() {
  return getSiteType() === SITE_TYPE.PRODUCTION;
}

/**
 * Check if current site is localhost
 * @returns {boolean}
 */
export function isLocalSite() {
  return getSiteType() === SITE_TYPE.LOCAL;
}

/**
 * Get URL for a different site type
 * @param {'production' | 'demo' | 'local'} siteType
 * @returns {string}
 */
export function getSiteUrl(siteType) {
  return SITE_URLS[siteType];
}
