import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL
         || import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
}

export const supa = createClient(url, key, { auth: { persistSession: false } });

export async function nextReference(): Promise<string> {
  const { data, error } = await supa.rpc('next_scope_reference');
  if (error) throw new Error('Failed to allocate reference: ' + error.message);
  return data as string;
}
