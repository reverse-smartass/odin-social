// ============================================================
// src/pages/SettingsPage.jsx
// ============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import "../styles/ui.css";
import "../styles/layout.css";

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || "",
    identifier: user?.identifier || "",
    email: user?.email || "",
    about: user?.about || "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileErrors, setProfileErrors] = useState([]);

  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwErrors, setPwErrors] = useState([]);

  function setProfile(field) {
    return (e) => setProfileForm((prev) => ({ ...prev, [field]: e.target.value }));
  }
  function setPw(field) {
    return (e) => setPwForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    setProfileErrors([]);
    setProfileLoading(true);
    try {
      const { updateduser } = await api.editUser(user.id, {
        displayName: profileForm.displayName,
        identifier: profileForm.identifier,
        email: profileForm.email,
      });
      updateUser({
        displayName: updateduser.displayName,
        identifier: updateduser.identifier,
        email: updateduser.email,
      });
      toast("Profile updated!");
    } catch (err) {
      if (err?.errors) setProfileErrors(err.errors.map((e) => e.msg));
      else setProfileErrors(["Something went wrong."]);
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    setPwErrors([]);
    if (pwForm.new_password !== pwForm.confirm) {
      setPwErrors(["New passwords do not match."]);
      return;
    }
    setPwLoading(true);
    try {
      await api.editPassword(user.id, {
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      });
      toast("Password updated! Please sign in again.");
      setTimeout(() => { logout(); navigate("/login"); }, 1600);
    } catch (err) {
      if (err?.errors) setPwErrors(err.errors.map((e) => e.msg));
      else setPwErrors([err?.error || "Failed to update password."]);
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <>
      <div className="feed-header">
        <span className="feed-header__title">Settings</span>
      </div>

      <div className="settings-page">

        {/* Appearance */}
        <div className="settings-section">
          <div className="settings-section__title">Appearance</div>
          <div className="theme-toggle">
            <span>Dark mode</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={dark} onChange={toggle} />
              <span className="toggle-switch__track" />
            </label>
          </div>
        </div>

        {/* Profile */}
        <div className="settings-section">
          <div className="settings-section__title">Profile</div>

          {profileErrors.length > 0 && (
            <div className="form-errors">
              {profileErrors.map((e, i) => <span key={i}>{e}</span>)}
            </div>
          )}

          <form onSubmit={handleProfileSave}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
              <img
                className="avatar avatar--xl"
                src={user?.profilePicture || `https://api.dicebear.com/8.x/identicon/svg?seed=${user?.identifier}`}
                alt={user?.identifier}
              />
              <div>
                <div style={{ fontWeight: 500 }}>{user?.displayName || user?.identifier}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>@{user?.identifier}</div>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Display Name</label>
              <input className="form-input" value={profileForm.displayName} onChange={setProfile("displayName")} placeholder="Your name" />
            </div>
            <div className="form-field">
              <label className="form-label">Identifier (handle)</label>
              <input className="form-input" value={profileForm.identifier} onChange={setProfile("identifier")} placeholder="handle" />
            </div>
            <div className="form-field">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={profileForm.email} onChange={setProfile("email")} />
            </div>

            <button type="submit" className="btn btn--primary btn--sm" disabled={profileLoading}>
              {profileLoading ? "Saving…" : "Save Profile"}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="settings-section">
          <div className="settings-section__title">Change Password</div>

          {pwErrors.length > 0 && (
            <div className="form-errors">
              {pwErrors.map((e, i) => <span key={i}>{e}</span>)}
            </div>
          )}

          <form onSubmit={handlePasswordSave}>
            <div className="form-field">
              <label className="form-label">Current Password</label>
              <input className="form-input" type="password" value={pwForm.old_password} onChange={setPw("old_password")} placeholder="••••••••" required />
            </div>
            <div className="form-field">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" value={pwForm.new_password} onChange={setPw("new_password")} placeholder="Min. 6 characters" required />
            </div>
            <div className="form-field">
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" value={pwForm.confirm} onChange={setPw("confirm")} placeholder="Repeat new password" required />
            </div>
            <button type="submit" className="btn btn--primary btn--sm" disabled={pwLoading}>
              {pwLoading ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="settings-section" style={{ borderColor: "rgba(214,58,58,.3)" }}>
          <div className="settings-section__title" style={{ color: "var(--danger)" }}>Account</div>
          <button className="btn btn--danger btn--sm" onClick={() => { logout(); navigate("/login"); }}>
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
