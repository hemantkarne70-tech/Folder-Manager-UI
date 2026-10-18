
import { useState } from "react";
import { FolderOpen, LockKeyhole, UserRound } from "lucide-react";
import { login } from "./api/client";
import "./Login.css";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = await login(username.trim(), password);
      onLogin(token, username.trim());
    } catch {
      setError("Login failed. Check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">
          <FolderOpen size={30} />
        </div>

        <p className="login-eyebrow">YOUR PERSONAL WORKSPACE</p>
        <h1>Welcome back</h1>
        <p className="login-description">
          Sign in to access your folders and files.
        </p>

        <label htmlFor="username">Username</label>
        <div className="login-input">
          <UserRound size={18} />
          <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
          />
        </div>

        <label htmlFor="password">Password</label>
        <div className="login-input">
          <LockKeyhole size={18} />
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>

        {error && <div className="login-error" role="alert">{error}</div>}

        <button className="login-submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p className="login-footnote">
          Secure access to your personal workspace
        </p>
      </form>
    </main>
  );
}
