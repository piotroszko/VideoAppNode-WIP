const express = require("express");
const router = express.Router();
const httpStatus = require("../lib/httpStatus");
const verifyToken = require("../lib/verifyToken");
const Video = require("../models/Video");
const config = require("../config/index");
const Comment = require("../models/Comment");
const CommentLike = require("../models/CommentLike");
const User = require("../models/User");

router.get("/all/:id", function (req, res, next) {
  //get all comment for video
  Video.findOne({ id: req.params.id }, function (error, video) {
    if (error) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send(`Server error: ${error.message}`);
    }
    if (video) {
      Comment.find({ videoID: req.params.id }, async function (error, comment) {
        if (comment.length === 0) {
          return res.status(httpStatus.OK).send(comment);
        }
        const users = await User.find({
          $or: comment.map((v) => ({
            _id: v.userID,
          })),
        });
        const likes = await CommentLike.find({
          $or: comment.map((v) => ({
            commentID: v.id,
          })),
        });
        if (error) {
          return res
            .status(httpStatus.INTERNAL_SERVER_ERROR)
            .send(`Server error: ${error.message}`);
        }
        if (comment) {
          if (req.headers["authorization"] || req.headers["Authorization"]) {
            verifyToken(req, res, next);
            const comms = comment.map((com) => {
              let likeStatus = "none";
              if (
                likes
                  .find((f) => f.commentID === com.id)
                  ["liked"].includes(req.userId)
              ) {
                likeStatus = "like";
              } else if (
                likes
                  .find((f) => f.commentID === com.id)
                  .disliked.includes(req.userId)
              ) {
                likeStatus = "dislike";
              }
              return {
                id: com.id,
                title: com.title,
                content: com.content,
                likes: likes.find((c) => c.commentID == com.id).liked.length,
                dislikes: likes.find((c) => c.commentID == com.id).disliked
                  .length,
                likeStatus,
                videoID: com.videoID,
                userID: com.userID,
                userName: users.find((u) => u.id == com.userID).name,
                createdAt: com.createdAt,
              };
            });

            return res.status(httpStatus.OK).send(comms);
          } else {
            const comms = comment.map((com) => {
              return {
                id: com.id,
                title: com.title,
                content: com.content,
                likes: likes.find((c) => c.commentID == com.id).liked.length,
                dislikes: likes.find((c) => c.commentID == com.id).disliked
                  .length,
                videoID: com.videoID,
                userID: com.userID,
                userName: users.find((u) => u.id == com.userID).name,
              };
            });

            return res.status(httpStatus.OK).send(comms);
          }
        } else {
          return res.status(httpStatus.OK).send(`[]`);
        }
      });
    } else {
      return res
        .status(httpStatus.NOT_FOUND)
        .send(`Video not found (_id: ${req.videoId})`);
    }
  });
});
router.post("/add/:id", verifyToken, function (req, res) {
  const { title, content } = req.body;
  Video.findOne({ id: req.params.id }, function (error, video) {
    if (error) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send(`Server error: ${error.message}`);
    }
    if (video) {
      Comment.create(
        {
          userID: req.userId,
          videoID: req.params.id,
          title: title,
          content: content,
        },
        function (error, comment) {
          if (error) {
            const message = `Server error: ${error.message}`;
            return res
              .status(httpStatus.INTERNAL_SERVER_ERROR)
              .send({ comment: false, error: message });
          }
          CommentLike.create({ commentID: comment.id });
          res.status(httpStatus.OK).send({ comment: true, comment });
        }
      );
    } else {
      return res
        .status(httpStatus.NOT_FOUND)
        .send(`Video not found (_id: ${req.videoId})`);
    }
  });
});

router.delete("/del/:id", verifyToken, function (req, res) {
  Comment.deleteMany(
    {
      userID: req.userId,
      _id: req.params.id,
    },
    async function (error) {
      if (error) {
        const message = `Server error: ${error.message}`;
        return res
          .status(httpStatus.INTERNAL_SERVER_ERROR)
          .send({ comment: false, error: message });
      }
      await CommentLike.deleteMany({ commentID: req.params.id });
      res.status(httpStatus.OK).send({ commentDeleted: true });
    }
  );
});
router.get("/like/:id", verifyToken, function (req, res) {
  CommentLike.findOne({ commentID: req.params.id }, function (err, item) {
    if (err) {
      return res.status(httpStatus.BAD_REQUEST).send(" Server error ");
    }
    if (item) {
      if (item.liked.includes(req.userId)) {
        return res.status(httpStatus.OK).send({ likeStatus: "like" });
      } else if (item.disliked.includes(req.userId)) {
        return res.status(httpStatus.OK).send({ likeStatus: "dislike" });
      } else {
        return res.status(httpStatus.OK).send({ likeStatus: "none" });
      }
    } else {
      return res.status(httpStatus.BAD_REQUEST).send("Not found");
    }
  });
});

router.post("/like/:id", verifyToken, function (req, res) {
  CommentLike.findOne({ commentID: req.params.id }, function (err, item) {
    if (err) {
      return res.status(httpStatus.BAD_REQUEST).send(" Server error ");
    }
    if (item) {
      if (item.liked.includes(req.userId)) {
        return res.status(httpStatus.OK).send({ likeStatus: "like" });
      } else if (item.disliked.includes(req.userId)) {
        item.disliked = item.disliked.filter((i) => i === req.userId);
        item.liked.push(req.userId);
        item.save();
        return res.status(httpStatus.OK).send({ likeStatus: "like" });
      } else {
        item.liked.push(req.userId);
        item.save();
        return res.status(httpStatus.OK).send({ likeStatus: "like" });
      }
    } else {
      return res.status(httpStatus.BAD_REQUEST).send(" Bad request ");
    }
  });
});
router.post("/dislike/:id", verifyToken, function (req, res) {
  CommentLike.findOne({ commentID: req.params.id }, function (err, item) {
    if (err) {
      return res.status(httpStatus.BAD_REQUEST).send(" Server error ");
    }
    if (item) {
      if (item.disliked.includes(req.userId)) {
        return res.status(httpStatus.OK).send({ likeStatus: "dislike" });
      } else if (item.liked.includes(req.userId)) {
        item.liked = item.liked.filter((i) => i === req.userId);
        item.disliked.push(req.userId);
        item.save();
        return res.status(httpStatus.OK).send({ likeStatus: "dislike" });
      } else {
        item.disliked.push(req.userId);
        item.save();
        return res.status(httpStatus.OK).send({ likeStatus: "dislike" });
      }
    } else {
      return res.status(httpStatus.BAD_REQUEST).send(" Bad request ");
    }
  });
});
router.post("/unlike/:id", verifyToken, function (req, res) {
  CommentLike.findOne({ commentID: req.params.id }, function (err, item) {
    if (err) {
      return res.status(httpStatus.BAD_REQUEST).send(" Server error ");
    }
    if (item) {
      item.liked = item.liked.filter((i) => i === req.userId);
      item.disliked = item.disliked.filter((i) => i === req.userId);
      item.save();
      return res.status(httpStatus.OK).send({ likeStatus: "none" });
    } else {
      return res.status(httpStatus.BAD_REQUEST).send(" Bad request ");
    }
  });
});

router.get("/my/", verifyToken, async function (req, res) {
  try {
    const comments = await Comment.find({ userID: req.userId });
    if (comments.length === 0) {
      return res.status(httpStatus.OK).send([]);
    }
    const videos = await Video.find({
      $or: comments.map((c) => ({
        id: c.videoID,
      })),
    });
    const channels = await User.find({
      $or: videos.map((v) => ({
        _id: v.userId,
      })),
    });
    const commentLikes = await CommentLike.find({
      $or: comments.map((c) => ({
        commentID: c._id,
      })),
    });
    const commentsList = videos.map((v) => ({
      id: v.id,
      name: v.name,
      userId: v.userId,
      channelName: channels.find((u) => u.id == v.userId).name,
      comments: comments
        .filter((c) => c.videoID === v.id)
        .map((c) => {
          return {
            title: c.title,
            content: c.content,
            likes: commentLikes.find((cl) => cl.commentID == c._id).liked
              .length,
            dislikes: commentLikes.find((cl) => cl.commentID == c._id).disliked
              .length,
          };
        }),
    }));
    return res.status(httpStatus.OK).send(commentsList);
  } catch (err) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send(`Server error: ${err}`);
  }
});

module.exports = router;
