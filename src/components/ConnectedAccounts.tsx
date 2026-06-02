import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { hasEmailIdentity } from "../lib/identities";

export function ConnectedAccounts() {
  const { identities, googleLinked, linkGoogleAccount, refreshIdentities } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLinkGoogle = hasEmailIdentity(identities) && !googleLinked;

  if (!canLinkGoogle && googleLinked) {
    return (
      <p className="connected-accounts connected-accounts--ok">
        Google is connected to this account.
      </p>
    );
  }

  if (!canLinkGoogle) return null;

  async function handleLink() {
    setLoading(true);
    setError(null);
    try {
      await linkGoogleAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect Google");
      setLoading(false);
    }
  }

  return (
    <section className="connected-accounts" aria-label="Connected accounts">
      <p className="connected-accounts__lead">
        You signed up with email. Connect Google to sign in with either method — same logs and goals.
      </p>
      {error ? (
        <p className="status status--error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="button" className="btn btn--ghost btn--small" disabled={loading} onClick={() => void handleLink()}>
        {loading ? "Redirecting…" : "Connect Google"}
      </button>
      <button
        type="button"
        className="btn btn--ghost btn--small connected-accounts__refresh"
        onClick={() => void refreshIdentities()}
      >
        Refresh
      </button>
    </section>
  );
}
