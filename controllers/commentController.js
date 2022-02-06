const express = require("express");
const router = express.Router();
const httpStatus = require("../lib/httpStatus");
const verifyToken = require("../lib/verifyToken");
const Video = require("../models/Video");
const config = require("../config/index");
const Comment = require("../models/Comment");
const CommentLike = require("../models/CommentLike");

router.get("/all/:id", function (req, res) {
  //get all comment for video
  Video.findOne({ id: req.params.id }, function (error, video) {
    if (error) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send(`Server error: ${error.message}`);
    }
    if (video) {
      Comment.find({ videoID: req.params.id }, function (error, comment) {
        if (error) {
          return res
            .status(httpStatus.INTERNAL_SERVER_ERROR)
            .send(`Server error: ${error.message}`);
        }
        if (comment) {
          return res.status(httpStatus.OK).send(comment);
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
  Comment.deleteOne(
    {
      userID: req.userId,
      commentID: req.params.id,
    },
    function (error) {
      if (error) {
        const message = `Server error: ${error.message}`;
        return res
          .status(httpStatus.INTERNAL_SERVER_ERROR)
          .send({ comment: false, error: message });
      }
      CommentLike.deleteMany({ commentID: req.params.id });
      res.status(httpStatus.OK).send({ commentDeleted: true });
    }
  );
});
router.get("/like/:id", verifyToken, function (req, res) {
  CommentLike.findOne(
    { commentID: req.params.id, userID: req.userId },
    function (err, item) {
      if (err) {
        return res.status(httpStatus.BAD_REQUEST).send(" Server error ");
      }
      if (item) {
        res.status(httpStatus.OK).send({ likeStatus: item.likeStatus });
      } else {
        res.status(httpStatus.OK).send({ likeStatus: "none" });
      }
    }
  );
});

router.post("/like/:id", verifyToken, function (req, res) {
  CommentLike.updateOne(
    { commentID: req.params.id, userID: req.userId },
    { commentID: req.params.id, userID: req.userId, likeStatus: "like" },
    { upsert: true },
    function (err, response) {
      if (err) {
        return res.status(httpStatus.BAD_REQUEST).send(" Server error ");
      }
      if (response) {
        Comment.findOne({ _id: req.params.id }, function (err, comment) {
          comment.likes = comment.likes + 1;
          comment.save();
        });
        res.status(httpStatus.OK).send({ likeStatus: "like" });
      } else {
        return res.status(httpStatus.BAD_REQUEST).send(" Bad request ");
      }
    }
  );
});
router.post("/unlike/:id", verifyToken, function (req, res) {
  CommentLike.findOne(
    { commentID: req.params.id, userID: req.userId },
    function (err, comLike) {
      if (err) {
        return res.status(httpStatus.BAD_REQUEST).send(" Server error ");
      }
      if (response) {
        if (comLike.likeStatus == "like") {
          Comment.findOne({ _id: req.params.id }, function (err, comment) {
            comment.likes = comment.likes - 1;
            comment.save();
          });
        } else if (comLike.likeStatus == "dislike") {
          Comment.findOne({ _id: req.params.id }, function (err, comment) {
            comment.dislikes = comment.dislikes - 1;
            comment.save();
          });
        }
        comLike.likeStatu = "none";
        comLike.save();
        res.status(httpStatus.OK).send({ likeStatus: "none" });
      } else {
        return res.status(httpStatus.BAD_REQUEST).send(" Bad request ");
      }
    }
  );
});
router.post("/dislike/:id", verifyToken, function (req, res) {
  CommentLike.updateOne(
    { commentID: req.params.id, userID: req.userId },
    { commentID: req.params.id, userID: req.userId, likeStatus: "dislike" },
    { upsert: true },
    function (err, response) {
      if (err) {
        return res.status(httpStatus.BAD_REQUEST).send(" Server error ");
      }
      if (response) {
        Comment.findOne({ _id: req.params.id }, function (err, comment) {
          comment.dislikes = comment.dislikes + 1;
          comment.save();
        });
        res.status(httpStatus.OK).send({ likeStatus: "dislike" });
      } else {
        return res.status(httpStatus.BAD_REQUEST).send(" Bad request ");
      }
    }
  );
});

module.exports = router;
