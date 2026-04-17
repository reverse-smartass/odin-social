// ============================================================
// src/components/ComposeBox.jsx
// ============================================================
import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import "../styles/post.css";

const MAX = 280;

export default function ComposeBox({ replyToId = null, onPost, placeholder = "What's on your mind?" }) {
  const { user } = useAuth();
  const toast = useToast();
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [showMedia, setShowMedia] = useState(false);
  const [loading, setLoading] = useState(false);

  const isVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(mediaUrl);
  const remaining = MAX - content.length;

  async function handleSubmit() {
    if (!content.trim() || loading) return;
    setLoading(true);
    try {
      const res = await api.createPost({
        content: content.trim(),
        mediaUrl: mediaUrl.trim() || undefined,
        replyToId: replyToId || undefined,
      });
      setContent("");
      setMediaUrl("");
      setShowMedia(false);
      onPost?.(res.post);
      toast(replyToId ? "Reply posted!" : "Posted!");
    } catch (err) {
      toast(err?.errors?.[0]?.msg || "Failed to post", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
  }

  return (
    <div className="compose">
      <img
        className="compose__avatar"
        src={user?.profilePicture || `https://api.dicebear.com/8.x/identicon/svg?seed=${user?.identifier}`}
        alt={user?.identifier}
      />
      <div className="compose__body">
        <textarea
          className="compose__textarea"
          rows={2}
          placeholder={placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX))}
          onKeyDown={handleKey}
        />

        {showMedia && (
          <>
            <input
              className="compose__media-input"
              placeholder="Paste image or video URL…"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
            {mediaUrl && (
              <div className="compose__media-preview">
                {isVideo
                  ? <video src={mediaUrl} controls preload="metadata" />
                  : <img src={mediaUrl} alt="preview" onError={(e) => e.currentTarget.style.display = "none"} />
                }
              </div>
            )}
          </>
        )}

        <div className="compose__footer">
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            onClick={() => setShowMedia((v) => !v)}
            title="Add media URL"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <span className="compose__char-count" style={{ color: remaining < 20 ? "var(--danger)" : undefined }}>
            {remaining}
          </span>
          <button
            className="btn btn--primary btn--sm"
            onClick={handleSubmit}
            disabled={!content.trim() || remaining < 0 || loading}
          >
            {loading ? "Posting…" : replyToId ? "Reply" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
