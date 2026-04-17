// ============================================================
// src/pages/FeedPage.jsx
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import PostCard from "../components/PostCard";
import ComposeBox from "../components/ComposeBox";
import "../styles/post.css";
import "../styles/layout.css";

export default function FeedPage({ onAuthRequired }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef(null);
  const oldestTime = useRef(null);

  const fetchPosts = useCallback(async (older = false) => {
    if (!user) { setLoading(false); return; }
    try {
      const lt = older ? oldestTime.current : undefined;
      const res = await api.getFeed(lt);
      const incoming = res.posts || [];
      if (incoming.length < 20) setHasMore(false);
      if (incoming.length > 0) {
        oldestTime.current = incoming[incoming.length - 1].createdAt;
      }
      setPosts((prev) => older ? [...prev, ...incoming] : incoming);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

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

  function handleLikeToggle(postId, liked) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              Likes: liked ? [{ id: "me" }] : [],
              _count: { ...p._count, Likes: p._count.Likes + (liked ? 1 : -1) },
            }
          : p,
      ),
    );
  }

  function handleDelete(postId) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  function handleNewPost(post) {
    setPosts((prev) => [post, ...prev]);
  }

  return (
    <>
      <div className="feed-header">
        <span className="feed-header__title">Home</span>
      </div>

      {user && <ComposeBox onPost={handleNewPost} />}

      {loading && <div className="spinner" />}

      {!loading && !user && (
        <div className="empty-state">
          <p style={{ marginBottom: 14, fontSize: "1rem" }}>
            Welcome to <strong>chirp.</strong>
          </p>
          <p>Sign in to see posts from people you follow.</p>
        </div>
      )}

      {!loading && user && posts.length === 0 && (
        <div className="empty-state">
          <p>Your feed is empty.</p>
          <p style={{ marginTop: 6 }}>Follow people to see their posts here.</p>
        </div>
      )}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLikeToggle={user ? handleLikeToggle : onAuthRequired}
          onDelete={handleDelete}
          onClick={user ? undefined : onAuthRequired}
        />
      ))}

      {loadingMore && <div className="spinner" style={{ margin: "20px auto" }} />}
      <div ref={bottomRef} style={{ height: 1 }} />
    </>
  );
}
