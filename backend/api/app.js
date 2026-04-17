// ============================================================
// app.js — Express + Socket.io server
// ============================================================

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cors from "cors";
import prisma from "../../lib/prisma.ts";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import "dotenv/config";

import messageRouter from "./messagesRoute.js";
import userRouter from "./userRoute.js";
import chatroomRouter from "./chatroomRoute.js";
import signupRouter from "./signupRoute.js";
import friendRouter from "./friendRoute.js";
import postRouter from "./postRoute.js";

const app = express();
const httpServer = createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || "a safe secret";

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

// ── Socket.io ─────────────────────────────────────────────────
export const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
});

// JWT auth middleware for Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication error"));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.userId = payload.id;
    next();
  } catch {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.userId}`);

  // Join a chatroom room
  socket.on("join_room", (chatroomId) => {
    socket.join(chatroomId);
  });

  // Leave a chatroom room
  socket.on("leave_room", (chatroomId) => {
    socket.leave(chatroomId);
  });

  // Send message — validated server-side, saved to DB, then broadcast
  socket.on("send_message", async ({ chatroomId, content }) => {
    if (!content?.trim() || !chatroomId) return;

    try {
      // Verify sender is member
      const membership = await prisma.chatroom.count({
        where: { id: chatroomId, users: { some: { id: socket.userId } } },
      });
      if (membership === 0) return;

      const message = await prisma.message.create({
        data: { content: content.trim(), senderId: socket.userId, chatroomId },
        include: {
          sender: { select: { id: true, displayName: true, identifier: true, profilePicture: true } },
        },
      });

      // Broadcast to everyone in the room including sender
      io.to(chatroomId).emit("new_message", message);
    } catch (err) {
      console.error("send_message error:", err);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Edit message
  socket.on("edit_message", async ({ messageId, content }) => {
    if (!content?.trim()) return;
    try {
      const msg = await prisma.message.findUnique({ where: { id: messageId } });
      if (!msg || msg.senderId !== socket.userId) return;

      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { content: content.trim(), edited: true },
        include: {
          sender: { select: { id: true, displayName: true, identifier: true, profilePicture: true } },
        },
      });

      io.to(msg.chatroomId).emit("message_edited", updated);
    } catch (err) {
      console.error("edit_message error:", err);
    }
  });

  // Delete message
  socket.on("delete_message", async ({ messageId }) => {
    try {
      const msg = await prisma.message.findUnique({ where: { id: messageId } });
      if (!msg || msg.senderId !== socket.userId) return;

      await prisma.message.delete({ where: { id: messageId } });
      io.to(msg.chatroomId).emit("message_deleted", { messageId, chatroomId: msg.chatroomId });
    } catch (err) {
      console.error("delete_message error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.userId}`);
  });
});

// ── Express middleware ────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Passport ──────────────────────────────────────────────────
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { email: username } });
      if (!user) return done(null, false, { message: "Incorrect username" });
      const match = await bcrypt.compare(password, user.password);
      if (!match) return done(null, false, { message: "Incorrect password" });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }),
);

passport.use(
  new JwtStrategy(
    { jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: JWT_SECRET },
    async (jwt_payload, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { id: jwt_payload.id } });
        if (user) return done(null, user);
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    },
  ),
);

app.use(passport.initialize());

// ── Routes ────────────────────────────────────────────────────
app.use("/sign-up", signupRouter);
app.use("/message", messageRouter);
app.use("/user", userRouter);
app.use("/chatroom", chatroomRouter);
app.use("/friend", friendRouter);
app.use("/post", postRouter);

app.post("/login", (req, res, next) => {
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: info?.message || "Login failed" });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1d" });
    return res.status(200).json({
      message: "Logged in successfully",
      user: {
        id: user.id,
        email: user.email,
        identifier: user.identifier,
        displayName: user.displayName,
        profilePicture: user.profilePicture,
      },
      token,
    });
  })(req, res, next);
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

httpServer.listen(5000, () => console.log("Server listening on port 5000"));
