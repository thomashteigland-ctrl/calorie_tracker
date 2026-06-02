import { createClient } from "@supabase/supabase-js";
import { getConfigIssues, getSupabaseEnv } from "./env";

const { url, anonKey, schema } = getSupabaseEnv();

if (!url?.trim() || !anonKey?.trim()) {
  const issues = getConfigIssues();
  throw new Error(issues.join(" ") || "Missing Supabase configuration.");
}

export const supabase = createClient(url.trim(), anonKey.trim(), {
  db: { schema },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
