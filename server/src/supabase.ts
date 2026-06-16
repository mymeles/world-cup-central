import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';

/** Read client — anon key, used for all public read queries (RLS: SELECT only). */
export const db: SupabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: { persistSession: false },
});

/** Write client — service role, used only by ingestion. Null until a key is set. */
export const dbWrite: SupabaseClient | null = config.supabaseServiceKey
  ? createClient(config.supabaseUrl, config.supabaseServiceKey, { auth: { persistSession: false } })
  : null;
