// ============================================================
// postRoute.js
// ============================================================

import { Router } from "express";
import prisma from "../../lib/prisma.ts";
import { body, validationResult } from "express-validator";
import passport from "passport";

const postRouter = Router();

// Reusable post include shape
const postInclude = (userId) => ({
  author: {
    select: { id: true, displayName: true, identifier: true, profilePicture: true },
  },
  _count: { select: { Likes: true, replies: true } },
  Likes: { where: { id: userId }, select: { id: true } },
});

const validatePost = [
  body("content").trim().notEmpty().withMessage("Post content is required"),
  body("title").trim().optional(),
  body("mediaUrl").trim().optional().isURL().withMessage("mediaUrl must be a valid URL"),
  body("replyToId").trim().optional(),
];

export const isOwner = (modelName, paramKey) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramKey];
      const resource = await prisma[modelName].findUnique({ where: { id: resourceId } });
      if (!resource) return res.status(404).json({ error: `${modelName} not found` });
      const ownerId = resource.authorId || resource.ownerId;
      if (ownerId !== req.user.id)
        return res.status(403).json({ error: `You are not authorized to modify this ${modelName}.` });
      next();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
};

// ── POST /newpost ─────────────────────────────────────────────
postRouter.post(
  "/newpost",
  passport.authenticate("jwt", { session: false }),
  validatePost,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.json({ errors: errors.array(), previousData: req.body });

    const { title, content, mediaUrl, replyToId } = req.body;
    try {
      const post = await prisma.post.create({
        data: {
          title,
          content,
          mediaUrl: mediaUrl || null,
          replyTo: replyToId !== undefined ? { connect: { id: replyToId } } : undefined,
          author: { connect: { id: req.user.id } },
        },
        include: postInclude(req.user.id),
      });
      res.status(201).json({ message: "post created", post });
    } catch (err) {
      return next(err);
    }
  },
);

// ── PATCH /:postid/editpost ───────────────────────────────────
postRouter.patch(
  "/:postid/editpost",
  passport.authenticate("jwt", { session: false }),
  isOwner("post", "postid"),
  validatePost,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.json({ errors: errors.array(), previousData: req.body });

    const { title, content, mediaUrl } = req.body;
    try {
      const updatedPost = await prisma.post.update({
        where: { id: req.params.postid },
        data: { title, content, mediaUrl: mediaUrl || null },
        include: postInclude(req.user.id),
      });
      res.status(200).json({ message: "post updated", updatedPost });
    } catch (err) {
      return next(err);
    }
  },
);

// ── DELETE /:postid/delete ────────────────────────────────────
postRouter.delete(
  "/:postid/delete",
  passport.authenticate("jwt", { session: false }),
  isOwner("post", "postid"),
  async (req, res, next) => {
    try {
      const deletedPost = await prisma.post.delete({ where: { id: req.params.postid } });
      res.status(200).json({ message: "post deleted", deletedPost });
    } catch (err) {
      if (err.code === "P2025") return res.status(404).json({ error: "Post not found" });
      return next(err);
    }
  },
);

// ── GET /feed ─────────────────────────────────────────────────
postRouter.get(
  "/feed",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { latestPostTime } = req.query;
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { following: { select: { id: true } } },
      });
      if (!currentUser) return res.status(404).json({ error: "User not found" });

      const posts = await prisma.post.findMany({
        take: 20,
        where: {
          replyToId: null, // top-level posts only in feed
          authorId: {
            in: currentUser.following.map((u) => u.id).concat(currentUser.id),
          },
          createdAt: { lt: latestPostTime ? new Date(latestPostTime) : new Date() },
        },
        orderBy: { createdAt: "desc" },
        include: postInclude(req.user.id),
      });

      return res.status(200).json({ posts });
    } catch (err) {
      res.status(500).json({ error: `Failed to fetch feed: ${err.message}` });
    }
  },
);

// ── GET /explore — global feed for non-followers ──────────────
postRouter.get(
  "/explore",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { latestPostTime } = req.query;
    try {
      const posts = await prisma.post.findMany({
        take: 20,
        where: {
          replyToId: null,
          createdAt: { lt: latestPostTime ? new Date(latestPostTime) : new Date() },
        },
        orderBy: { createdAt: "desc" },
        include: postInclude(req.user.id),
      });
      return res.status(200).json({ posts });
    } catch (err) {
      res.status(500).json({ error: `Failed to fetch explore: ${err.message}` });
    }
  },
);

// ── GET /:postid — single post ────────────────────────────────
postRouter.get(
  "/:postid",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const result = await prisma.post.findUnique({
        where: { id: req.params.postid },
        include: postInclude(req.user.id),
      });
      if (!result) return res.status(404).json({ error: "Post not found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ── GET /:postid/replies ──────────────────────────────────────
postRouter.get(
  "/:postid/replies",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { postid } = req.params;
    try {
      const post = await prisma.post.findUnique({ where: { id: postid } });
      if (!post) return res.status(404).json({ error: "Post not found" });

      const replies = await prisma.post.findMany({
        where: { replyToId: postid },
        orderBy: { createdAt: "asc" },
        include: postInclude(req.user.id),
      });
      res.json({ replies });
    } catch (err) {
      res.status(500).json({ error: `Failed to fetch replies: ${err.message}` });
    }
  },
);

// ── GET /user/:userid — user's posts ─────────────────────────
postRouter.get(
  "/user/:userid",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { latestPostTime } = req.query;
    try {
      const posts = await prisma.post.findMany({
        take: 20,
        where: {
          authorId: req.params.userid,
          replyToId: null,
          createdAt: { lt: latestPostTime ? new Date(latestPostTime) : new Date() },
        },
        orderBy: { createdAt: "desc" },
        include: postInclude(req.user.id),
      });
      res.json({ posts });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ── PATCH /:postid/toggle-like ────────────────────────────────
postRouter.patch(
  "/:postid/toggle-like",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { postid } = req.params;
    const userId = req.user.id;
    try {
      const post = await prisma.post.findUnique({
        where: { id: postid },
        include: { Likes: { where: { id: userId } } },
      });
      if (!post) return res.status(404).json({ error: "Post not found" });

      const alreadyLiked = post.Likes.length > 0;
      await prisma.post.update({
        where: { id: postid },
        data: { Likes: { [alreadyLiked ? "disconnect" : "connect"]: { id: userId } } },
      });
      res.json({ liked: !alreadyLiked });
    } catch (err) {
      res.status(500).json({ error: `Failed to toggle like: ${err.message}` });
    }
  },
);

export default postRouter;
