// ============================================================
// src/components/LeftNav.jsx
// ============================================================
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/layout.css";

const HomeIcon = () => (
  <svg className="nav-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const ExploreIcon = () => (
  <svg className="nav-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const ChatIcon = () => (
  <svg className="nav-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const ProfileIcon = () => (
  <svg className="nav-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const SettingsIcon = () => (
  <svg className="nav-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

export default function LeftNav({ onCompose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const nav = (to) => () => navigate(to);
  const active = (to) => pathname === to || pathname.startsWith(to + "/");

  return (
    <nav className="left-nav">
      <div className="left-nav__logo">chirp.</div>

      <button className={`nav-item${active("/feed") ? " nav-item--active" : ""}`} onClick={nav("/feed")}>
        <HomeIcon /><span>Home</span>
      </button>
      <button className={`nav-item${active("/explore") ? " nav-item--active" : ""}`} onClick={nav("/explore")}>
        <ExploreIcon /><span>Explore</span>
      </button>
      <button className={`nav-item${active("/messages") ? " nav-item--active" : ""}`} onClick={nav("/messages")}>
        <ChatIcon /><span>Messages</span>
      </button>
      <button className={`nav-item${active("/profile") ? " nav-item--active" : ""}`} onClick={nav(`/profile/${user?.id}`)}>
        <ProfileIcon /><span>Profile</span>
      </button>
      <button className={`nav-item${active("/settings") ? " nav-item--active" : ""}`} onClick={nav("/settings")}>
        <SettingsIcon /><span>Settings</span>
      </button>

      <div className="nav-spacer" />

      <button className="nav-compose" onClick={onCompose}>New Post</button>

      <div className="nav-user" onClick={nav(`/profile/${user?.id}`)}>
        <img
          className="avatar avatar--sm"
          src={user?.profilePicture || `https://api.dicebear.com/8.x/identicon/svg?seed=${user?.identifier}`}
          alt={user?.identifier}
        />
        <div className="nav-user__info">
          <div className="nav-user__name">{user?.displayName || user?.identifier}</div>
          <div className="nav-user__id">@{user?.identifier}</div>
        </div>
      </div>
    </nav>
  );
}
