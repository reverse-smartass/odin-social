// ============================================================
// src/components/PostCard.jsx
// ============================================================
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import "../styles/post.css";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function MediaEmbed({ url }) {
  if (!url) return null;
  const isVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(url);
  return (
    <div className="post-card__media">
      {isVideo
        ? <video src={url} controls preload="metadata" />
        : <img src={url} alt="media" loading="lazy" onError={(e) => e.currentTarget.style.display = "none"} />
      }
    </div>
  );
}

export default function PostCard({ post, onLikeToggle, onDelete, onClick }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const liked = post.Likes?.length > 0;
  const isOwn = post.author?.id === user?.id;

  async function handleLike(e) {
    e.stopPropagation();
    try {
      const res = await api.toggleLike(post.id);
      onLikeToggle?.(post.id, res.liked);
    } catch {
      toast("Failed to toggle like", "error");
    }
  }

  async function handleDelete(e) {
    e.stopPropagation();
    if (!confirm("Delete this post?")) return;
    try {
      await api.deletePost(post.id);
      onDelete?.(post.id);
      toast("Post deleted");
    } catch {
      toast("Failed to delete post", "error");
    }
  }

  function handleClick() {
    onClick ? onClick(post) : navigate(`/post/${post.id}`);
  }

  function handleAuthorClick(e) {
    e.stopPropagation();
    navigate(`/profile/${post.author?.id}`);
  }

  return (
    <article className="post-card" onClick={handleClick}>
      <img
        className="post-card__avatar"
        src={post.author?.profilePicture || `https://api.dicebear.com/8.x/identicon/svg?seed=${post.author?.identifier}`}
        alt={post.author?.displayName || post.author?.identifier}
        onClick={handleAuthorClick}
      />
      <div className="post-card__body">
        <div className="post-card__header">
          <span className="post-card__name" onClick={handleAuthorClick}>
            {post.author?.displayName || post.author?.identifier}
          </span>
          <span className="post-card__handle">@{post.author?.identifier}</span>
          <span className="post-card__dot">·</span>
          <span className="post-card__time">{timeAgo(post.createdAt)}</span>
          {isOwn && (
            <button
              className="btn btn--ghost btn--sm"
              style={{ marginLeft: "auto", padding: "2px 8px", fontSize: "0.75rem" }}
              onClick={handleDelete}
            >
              Delete
            </button>
          )}
        </div>

        {post.title && <div className="post-card__title">{post.title}</div>}
        <div className="post-card__content">{post.content}</div>
        <MediaEmbed url={post.mediaUrl} />

        <div className="post-card__actions">
          <button
            className="post-action post-action--reply"
            onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }}
          >
            <svg className="post-action__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {post._count?.replies ?? 0}
          </button>
          <button
            className={`post-action post-action--like${liked ? " active" : ""}`}
            onClick={handleLike}
          >
            <svg className="post-action__icon" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {post._count?.Likes ?? 0}
          </button>
        </div>
      </div>
    </article>
  );
}
