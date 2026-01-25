import { createClient } from '@supabase/supabase-js';

// In demo-only mode or during build without env vars, use dummy values
// to prevent initialization errors (actual auth is handled at runtime)
const isDemoOnly = process.env.NEXT_PUBLIC_DEMO_ONLY === 'true';
const supabaseUrl =
  isDemoOnly || !process.env.NEXT_PUBLIC_SUPABASE_URL
    ? 'https://placeholder.supabase.co'
    : process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  isDemoOnly || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? 'placeholder-anon-key'
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use PKCE flow for OAuth (more secure, works with SSR)
    flowType: 'pkce',
    // Auto-refresh tokens
    autoRefreshToken: true,
    // Persist session in localStorage
    persistSession: true,
    // Detect session from URL on page load (for OAuth callback)
    detectSessionInUrl: true,
  },
});
