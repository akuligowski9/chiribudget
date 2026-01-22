import { createClient } from '@supabase/supabase-js';

// In demo-only mode, Supabase isn't needed (auth is skipped)
// Use dummy values to prevent initialization errors
const isDemoOnly = process.env.NEXT_PUBLIC_DEMO_ONLY === 'true';
const supabaseUrl = isDemoOnly
  ? 'https://demo.supabase.co'
  : process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = isDemoOnly
  ? 'demo-anon-key'
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
