// ============================================================
// src/api.js
// ============================================================

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

export const api = {
  // Auth
  login:  (email, password) => req("POST", "/login", { username: email, password }),
  signup: (identifier, email, password, password_confirm) =>
    req("POST", "/sign-up", { identifier, email, password, password_confirm }),

  // User
  getUser:      (id)       => req("GET",    `/user/${id}`),
  editUser:     (id, body) => req("PATCH",  `/user/${id}/edituser`, body),
  editPassword: (id, body) => req("PATCH",  `/user/${id}/editpassword`, body),
  deleteUser:   (id)       => req("DELETE", `/user/${id}/delete`),
  toggleFollow: (id)       => req("PATCH",  `/user/${id}/toggle-follow/`),

  // Posts
  getFeed:       (lt) => req("GET", `/post/feed${lt ? `?latestPostTime=${lt}` : ""}`),
  getExplore:    (lt) => req("GET", `/post/explore${lt ? `?latestPostTime=${lt}` : ""}`),
  getPost:       (id) => req("GET", `/post/${id}`),
  getReplies:    (id) => req("GET", `/post/${id}/replies`),
  getUserPosts:  (uid, lt) => req("GET", `/post/user/${uid}${lt ? `?latestPostTime=${lt}` : ""}`),
  createPost:    (body)    => req("POST",   "/post/newpost", body),
  editPost:      (id, body)=> req("PATCH",  `/post/${id}/editpost`, body),
  deletePost:    (id)      => req("DELETE", `/post/${id}/delete`),
  toggleLike:    (id)      => req("PATCH",  `/post/${id}/toggle-like`),

  // Chatrooms
  getChatrooms:  ()             => req("GET",    "/chatroom/"),
  getChatroom:   (id)           => req("GET",    `/chatroom/${id}`),
  createChatroom:(body)         => req("POST",   "/chatroom/new", body),
  editChatroom:  (id, body)     => req("PATCH",  `/chatroom/${id}/edit`, body),
  deleteChatroom:(id)           => req("DELETE", `/chatroom/${id}/delete`),
  addUserToRoom: (cid, uid)     => req("PATCH",  `/chatroom/${cid}/adduser/${uid}`),
  removeUserFromRoom: (cid,uid) => req("PATCH",  `/chatroom/${cid}/removeuser/${uid}`),

  // Messages
  getMessages: (chatroomId) => req("GET", `/message/inchatroom/${chatroomId}`),

  // Friends
  searchUsers:     (q)  => req("GET",   `/friend/search?q=${encodeURIComponent(q)}`),
  getFriends:      ()   => req("GET",   "/friend/"),
  getPending:      ()   => req("GET",   "/friend/pending"),
  sendRequest:     (id) => req("POST",  `/friend/request/${id}`),
  acceptRequest:   (id) => req("PATCH", `/friend/accept/${id}`),
  rejectRequest:   (id) => req("PATCH", `/friend/reject/${id}`),
};
