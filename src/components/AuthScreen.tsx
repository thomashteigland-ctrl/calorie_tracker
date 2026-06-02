import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getConfigIssues } from "../lib/env";

const configIssues = getConfigIssues();

export function AuthScreen() {
  const { signIn, signUp, signInWithGoogle, resendSignupConfirmation } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setAwaitingConfirmation(false);

    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        const { needsEmailConfirmation } = await signUp(email, password, displayName.trim() || undefined);
        if (needsEmailConfirmation) {
          setAwaitingConfirmation(true);
          setMessage(
            "Supabase sent a confirmation email (if your project has email enabled). Check spam. Or disable “Confirm email” in the dashboard and sign in with your password — no link required.",
          );
          setMode("signin");
        } else {
          setMessage("Account created — you are signed in.");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg.replace(/\n/g, " "));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await signInWithGoogle();
      // Browser navigates away to Google; no further UI updates needed
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      setError(msg.replace(/\n/g, " "));
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email.trim()) {
      setError("Enter your email above first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resendSignupConfirmation(email.trim());
      setMessage("Confirmation email sent again. Check spam and promotions folders.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Calorie Counter</h1>
        <p className="auth-card__lead">Sign in to log food and track your daily goals.</p>

        <button
          type="button"
          className="btn btn--google btn--block"
          disabled={loading}
          onClick={() => void handleGoogle()}
        >
          <span className="btn--google__icon" aria-hidden="true">
            G
          </span>
          Continue with Google
        </button>

        <p className="auth-divider">
          <span>or use email</span>
        </p>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={mode === "signin" ? "auth-tabs__active" : ""}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={mode === "signup" ? "auth-tabs__active" : ""}
            onClick={() => setMode("signup")}
          >
            Create account
          </button>
        </div>

        {configIssues.length > 0 ? (
          <div className="auth-config-warn" role="alert">
            <strong>Configuration issue</strong>
            <ul>
              {configIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" ? (
            <label>
              <span>Name (optional)</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
              />
            </label>
          ) : null}

          <label>
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </label>

          {error ? (
            <p className="status status--error" role="alert">
              {error}
            </p>
          ) : null}
          {message ? <p className="status status--success">{message}</p> : null}

          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {awaitingConfirmation ? (
          <div className="auth-help">
            <p className="auth-help__title">No confirmation email?</p>
            <ol className="auth-help__list">
              <li>
                In{" "}
                <a
                  href="https://supabase.com/dashboard/project/dhkzbmrlgcxaxrwimzjs/auth/providers"
                  target="_blank"
                  rel="noreferrer"
                >
                  Supabase → Authentication → Providers → Email
                </a>
                , turn off <strong>Confirm email</strong>, then sign in with your password.
              </li>
              <li>Check spam / promotions.</li>
              <li>
                Under{" "}
                <a
                  href="https://supabase.com/dashboard/project/dhkzbmrlgcxaxrwimzjs/auth/url-configuration"
                  target="_blank"
                  rel="noreferrer"
                >
                  URL configuration
                </a>
                , set Site URL to <code>http://localhost:5173</code> and add it to Redirect URLs.
              </li>
            </ol>
            <button type="button" className="btn btn--ghost btn--block" disabled={loading} onClick={handleResend}>
              Resend confirmation email
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
