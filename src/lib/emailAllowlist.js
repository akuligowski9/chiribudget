/**
 * Email allowlist for demo site OAuth access
 *
 * When OAuth is completed on the demo site, only emails in this list
 * can proceed to use the real Supabase connection.
 * Non-allowlisted users are redirected to the portfolio site.
 */

// Redirect URL for non-allowlisted users
export const REDIRECT_URL = 'https://akuligowski-portfolio.vercel.app/';

/**
 * Parse email allowlist from environment variable
 * @returns {string[]}
 */
function getEmailAllowlist() {
  const envEmails = process.env.NEXT_PUBLIC_DEMO_ALLOWED_EMAILS || '';

  if (!envEmails.trim()) {
    return [];
  }

  return envEmails
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

// Cache the allowlist at module load time
const ALLOWED_EMAILS = getEmailAllowlist();

/**
 * Check if an email is in the allowlist
 * @param {string} email - Email to check
 * @returns {boolean} - True if allowed
 */
export function isEmailAllowed(email) {
  if (!email) return false;

  const normalizedEmail = email.trim().toLowerCase();

  // If allowlist is empty, no one is allowed (fail-safe)
  if (ALLOWED_EMAILS.length === 0) {
    return false;
  }

  return ALLOWED_EMAILS.includes(normalizedEmail);
}
