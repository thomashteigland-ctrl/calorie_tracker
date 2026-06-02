/** Client-side Supabase config (Vite inlines VITE_* at build time). */
export function getSupabaseEnv() {
  return {
    url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
    schema: (import.meta.env.VITE_SUPABASE_SCHEMA as string | undefined) ?? "calories",
  };
}

export function getConfigIssues(): string[] {
  const { url, anonKey } = getSupabaseEnv();
  const issues: string[] = [];

  if (!url?.trim()) {
    issues.push(
      "VITE_SUPABASE_URL is missing. On Vercel: add it under Settings → Environment Variables, then redeploy (Vite bakes env in at build time).",
    );
  } else if (!url.includes(".supabase.co")) {
    issues.push("VITE_SUPABASE_URL should look like https://your-project.supabase.co (not .com).");
  }

  if (!anonKey?.trim()) {
    issues.push("VITE_SUPABASE_ANON_KEY is missing — add it on Vercel and redeploy.");
  } else if (anonKey.startsWith("sb_publishable_")) {
    issues.push(
      "Using a publishable key. If sign-in fails, copy the legacy anon public key (starts with eyJ…) from Supabase → Project Settings → API.",
    );
  }

  return issues;
}

export function formatAuthNetworkError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network")) {
    const issues = getConfigIssues();
    const base =
      "Could not reach Supabase. On the deployed site this usually means env vars were not set before the Vercel build, or the API key/URL is wrong.";
    return issues.length ? `${base}\n\n• ${issues.join("\n• ")}` : base;
  }
  return msg;
}
