# chirp. — Twitter-lite Social App

## Stack
- **Backend**: Express, Prisma (PostgreSQL), Passport JWT, Socket.io
- **Frontend**: React (Vite), React Router, socket.io-client

---

## File Map

```
backend/
├── app.js              # Express + Socket.io server (live chat handled here)
├── schema.prisma       # DB schema
├── postRoute.js        # Feed, explore, post CRUD, likes, replies
├── messagesRoute.js    # REST: history only. Live ops via Socket.io
├── chatroomRoute.js    # Chatroom CRUD (unchanged from previous version)
├── userRoute.js        # Profile, follow toggle, password change
├── friendRoute.js      # Friend requests, search, auto-DM creation
└── signupRoute.js      # Registration

frontend/src/
├── main.jsx
├── App.jsx             # Routing, soft/hard auth gates, compose modal
├── api.js              # All REST calls
├── context/
│   ├── AuthContext.jsx
│   ├── ThemeContext.jsx
│   └── ToastContext.jsx
├── hooks/
│   └── useSocket.js    # Shared Socket.io instance
├── components/
│   ├── LeftNav.jsx     # Sidebar navigation
│   ├── PostCard.jsx    # Post with like/reply actions + media embed
│   ├── ComposeBox.jsx  # Post/reply composer with media URL + char count
│   └── Modal.jsx
├── pages/
│   ├── FeedPage.jsx         # Following feed, infinite scroll
│   ├── ExplorePage.jsx      # Global feed, infinite scroll
│   ├── PostDetailPage.jsx   # Thread view with reply compose
│   ├── ProfilePage.jsx      # User profile, follow toggle, posts
│   ├── MessagesPage.jsx     # Live Socket.io chat with room sidebar
│   ├── SettingsPage.jsx     # Theme toggle, edit profile, change password
│   └── AuthPages.jsx        # LoginPage, SignupPage, NotPermittedPage
└── styles/
    ├── global.css      # CSS vars (light/dark), fonts, reset
    ├── layout.css      # App shell, left nav, feed column
    ├── post.css        # PostCard, ComposeBox, thread view
    └── ui.css          # Buttons, forms, modal, toast, chat, settings
```

---

## Setup

### Backend
```bash
npm install express socket.io @prisma/client passport passport-local \
  passport-jwt jsonwebtoken bcryptjs express-validator cors dotenv

npx prisma migrate dev --name init
node app.js
```

`.env`:
```
DATABASE_URL="postgresql://user:pass@localhost:5432/chirp"
JWT_SECRET="change-this"
CLIENT_ORIGIN="http://localhost:5173"
```

### Frontend
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install react-router-dom socket.io-client
# Copy src/ files into place
npm run dev
```

`.env`:
```
VITE_API_URL=http://localhost:5000
```

---

## Key behaviours

| Feature | How it works |
|---|---|
| Feed | `GET /post/feed` — posts from followed users + self, cursor-paginated by `createdAt`, top-level only |
| Explore | `GET /post/explore` — all top-level posts, same pagination |
| Replies | Self-referencing `Post` via `replyToId`; fetched with `GET /post/:id/replies` |
| Media embeds | `mediaUrl` field; rendered as `<video>` for `.mp4/.webm/.ogg`, otherwise `<img>` |
| Like | `PATCH /post/:id/toggle-like` — optimistic UI update on client |
| Follow | `PATCH /user/:id/toggle-follow/` — optimistic follower count update |
| Live chat | Socket.io events: `send_message`, `edit_message`, `delete_message` → server saves to DB + broadcasts to room |
| Group chat | Any chatroom with `isDirect=false` and `>2 users` is a group chat — no schema changes needed |
| Auth gates | Soft (feed/explore/post): shows sign-in modal. Hard (messages/settings): redirects to `/login` |
| Dark mode | `data-theme` attribute on `<html>`, persisted to `localStorage`, toggled in Settings |
| Theme fonts | Instrument Serif (display/italic) + Geist (body) |

---

## Socket.io events reference

| Client emits | Payload | Server does |
|---|---|---|
| `join_room` | `chatroomId` | `socket.join(chatroomId)` |
| `leave_room` | `chatroomId` | `socket.leave(chatroomId)` |
| `send_message` | `{ chatroomId, content }` | Saves to DB, emits `new_message` to room |
| `edit_message` | `{ messageId, content }` | Verifies ownership, updates DB, emits `message_edited` |
| `delete_message` | `{ messageId }` | Verifies ownership, deletes from DB, emits `message_deleted` |

| Server emits | Payload |
|---|---|
| `new_message` | Full message object with sender |
| `message_edited` | Updated message object with sender |
| `message_deleted` | `{ messageId, chatroomId }` |
