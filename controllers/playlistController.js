const express = require("express");
const router = express.Router();
const httpStatus = require("../lib/httpStatus");
const verifyToken = require("../lib/verifyToken");
const Video = require("../models/Video");
const config = require("../config/index");
const Comment = require("../models/Comment");
const CommentLike = require("../models/CommentLike");
const UserPlaylists = require("../models/UserPlaylists");

router.get("/all/", verifyToken, async function (req, res) {
  const playlists = await UserPlaylists.find({ userID: req.userId });

  return res.status(httpStatus.OK).send({ playlists });
});

module.exports = router;

module.exports = router;
