// ============================================================
// src/pages/LoginPage.jsx
// ============================================================
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import "../styles/ui.css";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(email, password);
      login(data.user, data.token);
      navigate("/feed");
    } catch (err) {
      setError(err?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">chirp.</div>
        <div className="auth-card__title">Sign in to your account</div>

        {error && <div className="form-errors"><span>{error}</span></div>}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label" htmlFor="email">Email</label>
            <input id="email" type="email" className="form-input" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" type="password" className="form-input" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn--primary btn--full" style={{ marginTop: 6 }} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="auth-card__footer">
          No account? <Link to="/signup">Sign up</Link>
          <br />
          <Link to="/feed" style={{ color: "var(--text-3)", fontSize: "0.78rem" }}>← Browse without signing in</Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// src/pages/SignupPage.jsx
// ============================================================
export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", email: "", password: "", password_confirm: "" });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      await api.signup(form.identifier, form.email, form.password, form.password_confirm);
      navigate("/login");
    } catch (err) {
      if (err?.errors) setErrors(err.errors.map((e) => e.msg));
      else setErrors([err?.message || "Something went wrong."]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">chirp.</div>
        <div className="auth-card__title">Create your account</div>

        {errors.length > 0 && (
          <div className="form-errors">{errors.map((e, i) => <span key={i}>{e}</span>)}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">Handle</label>
            <input className="form-input" placeholder="yourhandle" value={form.identifier}
              onChange={set("identifier")} required autoFocus />
          </div>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@example.com" value={form.email}
              onChange={set("email")} required />
          </div>
          <div className="form-field">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Min. 6 characters" value={form.password}
              onChange={set("password")} required />
          </div>
          <div className="form-field">
            <label className="form-label">Confirm Password</label>
            <input className="form-input" type="password" placeholder="Repeat password" value={form.password_confirm}
              onChange={set("password_confirm")} required />
          </div>
          <button type="submit" className="btn btn--primary btn--full" style={{ marginTop: 6 }} disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="auth-card__footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// src/pages/NotPermittedPage.jsx
// ============================================================
export function NotPermittedPage() {
  const navigate = useNavigate();
  return (
    <div className="error-page">
      <div className="error-page__code">403</div>
      <div className="error-page__title">Access denied</div>
      <div className="error-page__sub">You don't have permission to view this page.</div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="btn btn--primary" onClick={() => navigate("/login")}>Sign in</button>
        <button className="btn btn--outline" onClick={() => navigate("/feed")}>Go home</button>
      </div>
    </div>
  );
}

export default LoginPage;
