// ============================================================
// src/pages/MessagesPage.jsx
// ============================================================
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Routes, Route } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import "../styles/ui.css";

// ── Helpers ────────────────────────────────────────────────────
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function roomLabel(room, userId) {
  if (room.isDirect) {
    const other = room.users?.find((u) => u.id !== userId);
    return {
      name: other?.displayName || other?.identifier || "DM",
      sub: other ? `@${other.identifier}` : null,
      avatar: other?.profilePicture || `https://api.dicebear.com/8.x/identicon/svg?seed=${other?.identifier}`,
    };
  }
  return {
    name: room.roomName || "Group Chat",
    sub: `${room.users?.length ?? 0} members`,
    avatar: null,
  };
}

function groupMessages(msgs) {
  const groups = [];
  msgs.forEach((msg) => {
    const last = groups[groups.length - 1];
    if (last && last.senderId === msg.senderId) {
      last.items.push(msg);
    } else {
      groups.push({ senderId: msg.senderId, sender: msg.sender, items: [msg], firstTime: msg.createdAt });
    }
  });
  return groups;
}

// ── Chat panel ─────────────────────────────────────────────────
function ChatPanel({ room }) {
  const { user } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!room) return;
    setMessages([]);

    // Load history
    api.getMessages(room.id).then(setMessages).catch(() => {});

    // Join socket room
    socket.emit("join_room", room.id);

    // Listen for events
    const onNew = (msg) => setMessages((prev) => [...prev, msg]);
    const onEdited = (msg) => setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    const onDeleted = ({ messageId }) => setMessages((prev) => prev.filter((m) => m.id !== messageId));

    socket.on("new_message", onNew);
    socket.on("message_edited", onEdited);
    socket.on("message_deleted", onDeleted);

    return () => {
      socket.emit("leave_room", room.id);
      socket.off("new_message", onNew);
      socket.off("message_edited", onEdited);
      socket.off("message_deleted", onDeleted);
    };
  }, [room?.id, socket]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSend() {
    if (!text.trim()) return;
    socket.emit("send_message", { chatroomId: room.id, content: text.trim() });
    setText("");
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function startEdit(msg) {
    setEditingId(msg.id);
    setEditText(msg.content);
  }

  function saveEdit(msgId) {
    if (!editText.trim()) return;
    socket.emit("edit_message", { messageId: msgId, content: editText.trim() });
    setEditingId(null);
  }

  function deleteMsg(msgId) {
    socket.emit("delete_message", { messageId: msgId });
  }

  if (!room) return (
    <div className="chat-main" style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--text-3)", fontSize: "0.9rem" }}>Select a conversation</div>
    </div>
  );

  const label = roomLabel(room, user.id);
  const groups = groupMessages(messages);

  return (
    <div className="chat-main">
      <div className="chat-main__header">
        {label.avatar
          ? <img className="avatar avatar--sm" src={label.avatar} alt={label.name} />
          : <div className="avatar avatar--sm" style={{ background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600, color: "var(--accent)" }}>{label.name.slice(0,2).toUpperCase()}</div>
        }
        <div>
          <div style={{ fontWeight: 500 }}>{label.name}</div>
          {label.sub && <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>{label.sub}</div>}
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ color: "var(--text-3)", fontSize: "0.85rem", textAlign: "center", marginTop: 40 }}>
            No messages yet. Say hello!
          </div>
        )}

        {groups.map((group, gi) => (
          <div key={gi} className="msg-group">
            <div className="msg-group__meta">
              <img
                className="msg-group__avatar"
                src={group.sender?.profilePicture || `https://api.dicebear.com/8.x/identicon/svg?seed=${group.sender?.identifier}`}
                alt={group.sender?.identifier}
              />
              <span className="msg-group__name">
                {group.sender?.displayName || group.sender?.identifier}
              </span>
              <span className="msg-group__time">{formatTime(group.firstTime)}</span>
            </div>

            {group.items.map((msg) => {
              const isOwn = msg.senderId === user.id;
              return (
                <div key={msg.id} className="msg-bubble-row">
                  {editingId === msg.id ? (
                    <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        className="form-input"
                        style={{ flex: 1, padding: "6px 10px", fontSize: "0.88rem" }}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(msg.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                      />
                      <button className="btn btn--primary btn--sm" onClick={() => saveEdit(msg.id)}>Save</button>
                      <button className="btn btn--ghost btn--sm" onClick={() => setEditingId(null)}>✕</button>
                    </div>
                  ) : (
                    <div className={`msg-bubble${isOwn ? " msg-bubble--own" : ""}`}>
                      {msg.content}
                      {msg.edited && <span className="msg-edited">(edited)</span>}
                    </div>
                  )}

                  {isOwn && editingId !== msg.id && (
                    <div className="msg-actions">
                      <button className="msg-action-btn" onClick={() => startEdit(msg)} title="Edit">✎</button>
                      <button className="msg-action-btn msg-action-btn--danger" onClick={() => deleteMsg(msg.id)} title="Delete">✕</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <div className="chat-input-bar__inner">
          <textarea
            className="chat-input-bar__textarea"
            rows={1}
            placeholder={`Message ${label.name}…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            className="chat-input-bar__send"
            onClick={handleSend}
            disabled={!text.trim()}
            aria-label="Send"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main MessagesPage ──────────────────────────────────────────
export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getChatrooms()
      .then(({ result }) => {
        const mine = (result || []).filter((r) => r.users?.some((u) => u.id === user.id));
        setRooms(mine);
        if (mine.length > 0 && !activeRoom) setActiveRoom(mine[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar__header">Messages</div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && <div className="spinner" style={{ margin: "20px auto" }} />}
          {!loading && rooms.length === 0 && (
            <div style={{ padding: "20px 16px", color: "var(--text-3)", fontSize: "0.85rem" }}>
              No conversations yet.
            </div>
          )}
          {rooms.map((room) => {
            const label = roomLabel(room, user.id);
            return (
              <div
                key={room.id}
                className={`chat-room-item${activeRoom?.id === room.id ? " chat-room-item--active" : ""}`}
                onClick={() => setActiveRoom(room)}
              >
                {label.avatar
                  ? <img className="chat-room-item__avatar" src={label.avatar} alt={label.name} />
                  : <div className="chat-room-item__avatar" style={{ background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 600, color: "var(--accent)" }}>{label.name.slice(0,2).toUpperCase()}</div>
                }
                <div style={{ minWidth: 0 }}>
                  <div className="chat-room-item__name">{label.name}</div>
                  {label.sub && <div className="chat-room-item__sub">{label.sub}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat panel */}
      <ChatPanel room={activeRoom} />
    </div>
  );
}
