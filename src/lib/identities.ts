import type { UserIdentity } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export function hasGoogleIdentity(identities: UserIdentity[]): boolean {
  return identities.some((i) => i.provider === "google");
}

export function hasEmailIdentity(identities: UserIdentity[]): boolean {
  return identities.some((i) => i.provider === "email");
}

export async function fetchUserIdentities(): Promise<UserIdentity[]> {
  const { data, error } = await supabase.auth.getUserIdentities();
  if (error) throw error;
  return data?.identities ?? [];
}

export function formatOAuthCallbackError(): string | null {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const desc = params.get("error_description") ?? params.get("error");
  if (!desc) return null;
  return decodeURIComponent(desc.replace(/\+/g, " "));
}

export function clearOAuthHashFromUrl(): void {
  if (window.location.hash) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}
