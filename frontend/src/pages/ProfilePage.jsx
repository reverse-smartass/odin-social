// ============================================================
// src/pages/ProfilePage.jsx
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import PostCard from "../components/PostCard";
import "../styles/post.css";
import "../styles/layout.css";
import "../styles/ui.css";

export default function ProfilePage() {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const bottomRef = useRef(null);
  const oldestTime = useRef(null);

  const isOwn = user?.id === id;

  const fetchProfile = useCallback(async () => {
    try {
      const p = await api.getUser(id);
      setProfile(p);
      const isFollowing = p.followedBy?.some((f) => f.id === user?.id) ?? false;
      setFollowing(isFollowing);
    } catch {
      toast("Failed to load profile", "error");
    }
  }, [id, user?.id]);

  const fetchPosts = useCallback(async (older = false) => {
    try {
      const lt = older ? oldestTime.current : undefined;
      const res = await api.getUserPosts(id, lt);
      const incoming = res.posts || [];
      if (incoming.length < 20) setHasMore(false);
      if (incoming.length > 0) oldestTime.current = incoming[incoming.length - 1].createdAt;
      setPosts((prev) => older ? [...prev, ...incoming] : incoming);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setPosts([]);
    oldestTime.current = null;
    setHasMore(true);
    fetchProfile();
    fetchPosts();
  }, [id, fetchProfile, fetchPosts]);

  // Infinite scroll
  useEffect(() => {
    if (!hasMore) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loadingMore && !loading) {
        setLoadingMore(true);
        fetchPosts(true);
      }
    }, { threshold: 0.1 });
    if (bottomRef.current) obs.observe(bottomRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loading, fetchPosts]);

  async function handleFollowToggle() {
    if (!user) { navigate("/login"); return; }
    setFollowLoading(true);
    try {
      const res = await api.toggleFollow(id);
      setFollowing(res.followed);
      setProfile((p) => ({
        ...p,
        _count: {
          ...p._count,
          followedBy: (p._count?.followedBy ?? 0) + (res.followed ? 1 : -1),
        },
      }));
    } catch {
      toast("Failed to update follow", "error");
    } finally {
      setFollowLoading(false);
    }
  }

  function handleLikeToggle(postId, liked) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, Likes: liked ? [{ id: "me" }] : [], _count: { ...p._count, Likes: p._count.Likes + (liked ? 1 : -1) } }
          : p,
      ),
    );
  }

  function handleDelete(postId) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  if (!profile && !loading) return <div className="empty-state">User not found.</div>;

  return (
    <>
      <div className="feed-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn--ghost btn--sm" onClick={() => navigate(-1)} style={{ padding: "4px 10px" }}>
          ← Back
        </button>
        <span className="feed-header__title">
          {profile?.displayName || profile?.identifier || "Profile"}
        </span>
      </div>

      {/* Profile header */}
      <div style={{ padding: "24px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <img
            className="avatar avatar--xl"
            src={profile?.profilePicture || `https://api.dicebear.com/8.x/identicon/svg?seed=${profile?.identifier}`}
            alt={profile?.identifier}
          />
          {!isOwn && user && (
            <button
              className={`btn ${following ? "btn--outline" : "btn--primary"}`}
              onClick={handleFollowToggle}
              disabled={followLoading}
              style={{ minWidth: 100 }}
            >
              {followLoading ? "…" : following ? "Unfollow" : "Follow"}
            </button>
          )}
          {isOwn && (
            <button className="btn btn--outline btn--sm" onClick={() => navigate("/settings")}>
              Edit profile
            </button>
          )}
        </div>

        <div style={{ fontWeight: 600, fontSize: "1.05rem" }}>
          {profile?.displayName || profile?.identifier}
        </div>
        <div style={{ color: "var(--text-3)", fontSize: "0.85rem", marginBottom: 8 }}>
          @{profile?.identifier}
        </div>
        {profile?.about && (
          <div style={{ fontSize: "0.9rem", color: "var(--text-2)", marginBottom: 10 }}>
            {profile.about}
          </div>
        )}

        <div style={{ display: "flex", gap: 20, fontSize: "0.85rem", color: "var(--text-2)" }}>
          <span>
            <strong style={{ color: "var(--text-1)" }}>{profile?.following?.length ?? 0}</strong> Following
          </span>
          <span>
            <strong style={{ color: "var(--text-1)" }}>{profile?.followedBy?.length ?? 0}</strong> Followers
          </span>
        </div>
      </div>

      {/* Posts */}
      <div style={{ borderBottom: "1px solid var(--border)", padding: "12px 20px" }}>
        <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>Posts</span>
      </div>

      {loading && <div className="spinner" />}

      {!loading && posts.length === 0 && (
        <div className="empty-state">No posts yet.</div>
      )}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLikeToggle={handleLikeToggle}
          onDelete={handleDelete}
        />
      ))}

      {loadingMore && <div className="spinner" style={{ margin: "20px auto" }} />}
      <div ref={bottomRef} style={{ height: 1 }} />
    </>
  );
}
