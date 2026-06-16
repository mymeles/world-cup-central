import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';

const readKey = config.supabaseAnonKey || config.supabaseServiceKey;

if (!config.supabaseUrl || !readKey) {
  // Don't crash the whole service over a missing env var: the server still boots
  // and answers /health, while data endpoints surface a clear error until the
  // SUPABASE_URL / SUPABASE_ANON_KEY values are configured.
  console.warn(
    '[supabase] SUPABASE_URL or SUPABASE_ANON_KEY is not set — booting in degraded mode; data endpoints will error until configured.',
  );
}

/** Read client — anon key, used for all public read queries (RLS: SELECT only).
 *  Falls back to placeholders so a missing key degrades gracefully instead of
 *  throwing at startup. */
export const db: SupabaseClient = createClient(
  config.supabaseUrl || 'https://placeholder.supabase.co',
  readKey || 'anon-key-not-configured',
  { auth: { persistSession: false } },
);

/** Write client — service role, used only by ingestion. Null until a key is set. */
export const dbWrite: SupabaseClient | null =
  config.supabaseServiceKey && config.supabaseUrl
    ? createClient(config.supabaseUrl, config.supabaseServiceKey, { auth: { persistSession: false } })
    : null;
