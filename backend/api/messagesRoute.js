// ============================================================
// messagesRoute.js
// Live sending/editing/deleting is now handled via Socket.io.
// REST endpoints remain for fetching history on room load.
// ============================================================

import { Router } from "express";
import prisma from "../../lib/prisma.ts";
import passport from "passport";

const messageRouter = Router();

const senderSelect = {
  select: { id: true, displayName: true, identifier: true, profilePicture: true },
};

// ── GET /inchatroom/:chatroomid — load history ────────────────
messageRouter.get(
  "/inchatroom/:chatroomid",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { chatroomid } = req.params;
    try {
      // Verify membership
      const member = await prisma.chatroom.count({
        where: { id: chatroomid, users: { some: { id: req.user.id } } },
      });
      if (member === 0)
        return res.status(403).json({ error: "You are not a member of this chatroom." });

      const messages = await prisma.message.findMany({
        where: { chatroomId: chatroomid },
        include: { sender: senderSelect },
        orderBy: { createdAt: "asc" },
        take: 100, // last 100 messages on load
      });
      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ── GET /:messageid ───────────────────────────────────────────
messageRouter.get(
  "/:messageid",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const result = await prisma.message.findUnique({
      where: { id: req.params.messageid },
      include: { sender: senderSelect },
    });
    res.json(result);
  },
);

export default messageRouter;
