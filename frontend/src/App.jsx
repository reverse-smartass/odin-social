// ============================================================
// src/App.jsx
// ============================================================
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";

import LeftNav from "./components/LeftNav";
import Modal from "./components/Modal";
import ComposeBox from "./components/ComposeBox";

import FeedPage from "./pages/FeedPage";
import ExplorePage from "./pages/ExplorePage";
import PostDetailPage from "./pages/PostDetailPage";
import ProfilePage from "./pages/ProfilePage";
import MessagesPage from "./pages/MessagesPage";
import SettingsPage from "./pages/SettingsPage";
import { LoginPage, SignupPage, NotPermittedPage } from "./pages/AuthPages";

import "./styles/global.css";
import "./styles/layout.css";

// Gates
function AuthLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [compose, setCompose] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Feed/Explore are soft-gated (show modal), Settings/Messages hard-redirect
  const softGated = ["/feed", "/explore", "/post"].some((p) => location.pathname.startsWith(p));
  const hardGated = ["/settings", "/messages", "/profile"].some((p) => location.pathname.startsWith(p));

  if (!user && hardGated) return <Navigate to="/login" replace />;

  return (
    <>
      <div className="app-shell">
        {user && <LeftNav onCompose={() => setCompose(true)} />}
        <div className="feed-col" style={{ maxWidth: user ? undefined : "100%" }}>
          <Routes>
            <Route path="/feed"       element={<FeedPage onAuthRequired={() => setShowLoginModal(true)} />} />
            <Route path="/explore"    element={<ExplorePage onAuthRequired={() => setShowLoginModal(true)} />} />
            <Route path="/post/:id"   element={<PostDetailPage onAuthRequired={() => setShowLoginModal(true)} />} />
            <Route path="/profile/:id" element={<ProfilePage />} />
            <Route path="/messages/*" element={<MessagesPage />} />
            <Route path="/settings"   element={<SettingsPage />} />
            <Route path="/not-permitted" element={<NotPermittedPage />} />
            <Route path="*" element={<Navigate to="/feed" replace />} />
          </Routes>
        </div>
      </div>

      {/* Compose modal */}
      {compose && (
        <Modal title="New Post" onClose={() => setCompose(false)}>
          <ComposeBox onPost={() => { setCompose(false); navigate("/feed"); }} />
        </Modal>
      )}

      {/* Soft auth modal */}
      {showLoginModal && (
        <Modal title="Sign in to continue" onClose={() => setShowLoginModal(false)}>
          <p style={{ color: "var(--text-2)", fontSize: "0.9rem", marginBottom: 18 }}>
            You need an account to interact with posts.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn--outline btn--full" onClick={() => { setShowLoginModal(false); navigate("/login"); }}>
              Sign in
            </button>
            <button className="btn btn--primary btn--full" onClick={() => { setShowLoginModal(false); navigate("/signup"); }}>
              Sign up
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login"  element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/*"      element={<AuthLayout />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
