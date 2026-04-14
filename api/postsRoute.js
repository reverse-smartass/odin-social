import { Router } from "express";
import prisma from "../lib/prisma.ts";
import { body, validationResult } from "express-validator";
import passport from "passport";
const postRouter = Router();

const validatePost = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Post title is required")
    .escape(),
  body("text_content")
    .trim()
    .notEmpty()
    .withMessage("Post content is required")
    .escape(),
];

export const isOwner = (modelName, paramKey) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramKey];
      const resource = await prisma[modelName].findUnique({
        where: { id: resourceId },
      });

      if (!resource) {
        return res.status(404).json({ error: `${modelName} not found` });
      }

      // Check ownership. 
      // Note: Ensure your models use consistent naming (like ownerId or authorId)
      const ownerId = resource.authorId || resource.ownerId;

      if (ownerId !== req.user.id) {
        return res.status(403).json({ 
          error: `You are not authorized to access this ${modelName}.` 
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
};

/* const postIsFromUser = async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.postid } });
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.authorId !== req.user.id)
      return res.status(403).json({ error: "You are not authorized to edit this post." });
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}; */

postRouter.post("/newpost", passport.authenticate("jwt", { session: false }), validatePost, 
  async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({
      errors: errors.array(),
      previousData: req.body,
    });
  }

  const {title, text_content} = req.body;

  try {

    const post = await prisma.post.create({
      data: {
        title: title,
        content: text_content,
        Likes: {
          connect: []
        },
        comments: {
          connect: []
        },
        author : {
          connect: {id : req.user.id}
        }
      }
    });
    console.log("Created post:", post);
    res.status(201).json({
      message: "post created",
      user: { id: post.id, title: post.title, content: post.content},
    });
  } catch (err) {
    return next(err);
  }
  
});

postRouter.patch("/:postid/editpost", passport.authenticate("jwt", { session: false }), isOwner("post", "postid"), validatePost, 
  async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({
      errors: errors.array(),
      previousData: req.body,
    });
  }

  const postId = req.params.postid;
  const {title, text_content} = req.body;

  try {

    const updatedPost = await prisma.post.update({
      where: {
        id: postId,
      },
      data: {
        title: title,
        content: text_content,
      }
    });
    console.log("Updated post:", updatedPost);
    res.status(200).json({
      message: "post updated",
      updatedPost
    });
  } catch (err) {
    return next(err);
  }
  
});

postRouter.delete("/:postid/delete", passport.authenticate("jwt", { session: false }), isOwner("post", "postid"), 
  async (req, res, next) => {

  const postId = req.params.postid;

  try {

    const deletedPost = await prisma.post.delete({
      where: {
        id: postId,
      },
    });
    console.log("Deteted post:", deletedPost);
    res.status(200).json({
      message: "post deleted",
      deletedPost
    });
  } catch (err) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: "User not found" });
    } else {
      res.status(500).json({ error: "Something went wrong" });
    }
  }
  
});

postRouter.get("/", async (req, res) => {
  const result = await prisma.post.findMany();
  res.json({ result });
});

postRouter.get("/:postid", async (req, res) => {
  const postId = req.params.postid;

  const result = await prisma.post.findUnique({
    where: {
      id: postId,
    },
  });

  res.json(result);
});

postRouter.get("/:postid/comments", async (req, res) => {
  const postId = req.params.postid;

  const result = await prisma.comment.findMany({
    where: {
      postId: postId,
    },
  });

  res.json(result);
});

const validateComment = [
  body("comment")
    .trim()
    .notEmpty()
    .withMessage("Comment can't be empty")
    .escape(),
];

postRouter.post("/:postid/newcomment", passport.authenticate("jwt", { session: false }), validateComment,
async (req, res, next) => {
  const postId = req.params.postid;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({
      errors: errors.array(),
      previousData: req.body,
    });
  }

  const {comment} = req.body;

  try {

    const savedComment = await prisma.comment.create({
      data: {
        content: comment,
        author : {
          connect: {id : req.user.id}
        },
        post : {
          connect: {id : postId}
        }
      }
    });
    console.log("Comment saved:", comment);
    res.status(201).json({
      message: "comment saved",
      comment: { savedComment },
    });
  } catch (err) {
    return next(err);
  }
});

postRouter.patch("/edit-comment/:commentid/", passport.authenticate("jwt", { session: false }), isOwner("comment", "commentid"), validateComment,
async (req, res, next) => {
  const commentId = req.params.commentid;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({
      errors: errors.array(),
      previousData: req.body,
    });
  }

  const {comment} = req.body;

  try {
    const savedComment = await prisma.comment.update({
      where: {
        id: commentId,
      },
      data: {
        content: comment,
      }
    });
    console.log("Comment saved:", comment);
    res.status(200).json({
      message: "comment saved",
      comment: { savedComment },
    });
  } catch (err) {
    return next(err);
  }
});

postRouter.delete("/delete-comment/:commentid/", passport.authenticate("jwt", { session: false }), isOwner("comment", "commentid"), 
async (req, res, next) => {
  const commentId = req.params.commentid;

  try {
    const deletedComment = await prisma.comment.delete({
      where: {
        id: commentId,
      },
    });
    console.log("Comment deleted:", deletedComment);
    res.status(200).json({
      message: "comment deleted",
      comment: { deletedComment},
    });
  } catch (err) {
    return next(err);
  }
});



export default postRouter;
