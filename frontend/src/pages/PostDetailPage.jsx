// ============================================================
// src/pages/PostDetailPage.jsx
// ============================================================
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import ComposeBox from "../components/ComposeBox";
import PostCard from "../components/PostCard";
import "../styles/post.css";
import "../styles/layout.css";

function timeAgo(iso) {
  const d = new Date(iso);
  return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function MediaEmbed({ url }) {
  if (!url) return null;
  const isVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(url);
  return (
    <div className="post-card__media" style={{ marginBottom: 14 }}>
      {isVideo
        ? <video src={url} controls preload="metadata" />
        : <img src={url} alt="media" loading="lazy" onError={(e) => e.currentTarget.style.display = "none"} />}
    </div>
  );
}

export default function PostDetailPage({ onAuthRequired }) {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getPost(id), api.getReplies(id)])
      .then(([p, r]) => {
        setPost(p);
        setReplies(r.replies || []);
      })
      .catch(() => toast("Failed to load post", "error"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleLike() {
    if (!user) { onAuthRequired?.(); return; }
    try {
      const res = await api.toggleLike(post.id);
      setPost((p) => ({
        ...p,
        Likes: res.liked ? [{ id: "me" }] : [],
        _count: { ...p._count, Likes: p._count.Likes + (res.liked ? 1 : -1) },
      }));
    } catch { toast("Failed to toggle like", "error"); }
  }

  async function handleDeletePost() {
    if (!confirm("Delete this post?")) return;
    try {
      await api.deletePost(post.id);
      toast("Post deleted");
      navigate(-1);
    } catch { toast("Failed to delete", "error"); }
  }

  function handleNewReply(reply) {
    setReplies((prev) => [...prev, reply]);
    setPost((p) => ({ ...p, _count: { ...p._count, replies: p._count.replies + 1 } }));
  }

  function handleReplyLikeToggle(replyId, liked) {
    setReplies((prev) =>
      prev.map((r) =>
        r.id === replyId
          ? { ...r, Likes: liked ? [{ id: "me" }] : [], _count: { ...r._count, Likes: r._count.Likes + (liked ? 1 : -1) } }
          : r,
      ),
    );
  }

  function handleReplyDelete(replyId) {
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
  }

  if (loading) return <><div className="feed-header"><span className="feed-header__title">Post</span></div><div className="spinner" /></>;
  if (!post) return <div className="empty-state">Post not found.</div>;

  const liked = post.Likes?.length > 0;
  const isOwn = post.author?.id === user?.id;

  return (
    <>
      <div className="feed-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn--ghost btn--sm" onClick={() => navigate(-1)} style={{ padding: "4px 10px" }}>
          ← Back
        </button>
        <span className="feed-header__title">Post</span>
      </div>

      {/* Main post */}
      <div className="post-detail">
        <div className="post-detail__header">
          <img
            className="post-detail__avatar"
            src={post.author?.profilePicture || `https://api.dicebear.com/8.x/identicon/svg?seed=${post.author?.identifier}`}
            alt={post.author?.identifier}
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/profile/${post.author?.id}`)}
          />
          <div>
            <div className="post-detail__name" style={{ cursor: "pointer" }} onClick={() => navigate(`/profile/${post.author?.id}`)}>
              {post.author?.displayName || post.author?.identifier}
            </div>
            <div className="post-detail__handle">@{post.author?.identifier}</div>
          </div>
          {isOwn && (
            <button className="btn btn--danger btn--sm" style={{ marginLeft: "auto" }} onClick={handleDeletePost}>
              Delete
            </button>
          )}
        </div>

        {post.title && (
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: "1.15rem", marginBottom: 6 }}>
            {post.title}
          </div>
        )}

        <div className="post-detail__content">{post.content}</div>
        <MediaEmbed url={post.mediaUrl} />

        <div className="post-detail__meta">
          <span>{timeAgo(post.createdAt)}</span>
          <span><strong>{post._count?.Likes ?? 0}</strong> likes</span>
          <span><strong>{post._count?.replies ?? 0}</strong> replies</span>
        </div>

        <div className="post-detail__actions">
          <button
            className={`post-action post-action--reply`}
            style={{ fontSize: "0.88rem" }}
          >
            <svg className="post-action__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Reply
          </button>
          <button
            className={`post-action post-action--like${liked ? " active" : ""}`}
            style={{ fontSize: "0.88rem" }}
            onClick={handleLike}
          >
            <svg className="post-action__icon" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {liked ? "Unlike" : "Like"}
          </button>
        </div>
      </div>

      {/* Reply compose */}
      {user && (
        <ComposeBox
          replyToId={post.id}
          onPost={handleNewReply}
          placeholder={`Reply to @${post.author?.identifier}…`}
        />
      )}

      {/* Replies */}
      {replies.length === 0 && !loading && (
        <div className="empty-state">No replies yet. Be the first!</div>
      )}
      {replies.map((reply) => (
        <PostCard
          key={reply.id}
          post={reply}
          onLikeToggle={user ? handleReplyLikeToggle : onAuthRequired}
          onDelete={handleReplyDelete}
        />
      ))}
    </>
  );
}
