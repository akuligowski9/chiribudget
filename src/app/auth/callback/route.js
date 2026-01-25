import { NextResponse } from 'next/server';

/**
 * OAuth callback handler
 *
 * This route receives the OAuth redirect from Supabase and forwards to the
 * home page with the auth code. The client-side Supabase client will handle
 * the code exchange using the PKCE verifier stored in localStorage.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const error_description = searchParams.get('error_description');

  // If there's an error from the OAuth provider, show it
  if (error_description) {
    console.error('OAuth provider error:', error_description);
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(error_description)}`
    );
  }

  // Redirect to home with the full query string intact
  // The client-side Supabase client (with detectSessionInUrl: true)
  // will automatically exchange the code for a session
  const queryString = searchParams.toString();
  const redirectUrl = queryString ? `${origin}/?${queryString}` : origin;

  return NextResponse.redirect(redirectUrl);
}
