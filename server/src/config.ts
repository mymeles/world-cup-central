import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  geminiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  ingestEnabled: (process.env.INGEST_ENABLED ?? 'true') === 'true',
  ingestIntervalSec: Number(process.env.INGEST_INTERVAL_SEC ?? 60),
  sportsApiKey: process.env.SPORTS_API_KEY ?? '',
  sportsApiProvider: process.env.SPORTS_API_PROVIDER ?? 'api-football',
};

export const hasWriteAccess = () => !!config.supabaseServiceKey;
