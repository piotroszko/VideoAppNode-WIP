const express = require("express");
const router = express.Router();
const config = require("../config/index");

const httpStatus = require("../lib/httpStatus");
const verifyToken = require("../lib/verifyToken");

const Video = require("../models/Video");
const Comment = require("../models/Comment");
const CommentLike = require("../models/CommentLike");
const UserPlaylists = require("../models/UserPlaylists");
const UserHistory = require("../models/UserHistory");
const UserDetails = require("../models/UserDetails");

router.get("/all/", verifyToken, async function (req, res) {
  const playlists = await UserPlaylists.find({ userID: req.userId });
  return res.status(httpStatus.OK).send({ playlists });
});
router.post("/addPlaylist/", verifyToken, async function (req, res) {
  const { name } = req.body;
  if (!name) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .send({ registered: false, error: "Invalid parameters in request" });
  }
  UserPlaylists.findOne({ userID: req.userId }, async (err, userPlaylists) => {
    if (err) {
      return res.status(httpStatus.BAD_REQUEST).send({ Error: err });
    }
    if (userPlaylists) {
      if (userPlaylists.playlists.find((p) => p.name === name)) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send(`Playlist with that name already exists!`);
      } else {
        await UserPlaylists.updateOne(
          { userID: req.userId },
          { $push: { playlists: { name: name } } }
        );
        return res.status(httpStatus.OK).send(`Playlist added!`);
      }
    } else {
      return res.status(httpStatus.BAD_REQUEST).send("User not found!");
    }
  });
});
router.post("/addToPlaylist/", verifyToken, async function (req, res) {
  const { id, videoID } = req.body;
  if (!id || !videoID) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .send({ registered: false, error: "Invalid parameters in request" });
  }
  UserPlaylists.findOne({ userID: req.userId }, async (err, userPlaylists) => {
    if (err) {
      return res.status(httpStatus.BAD_REQUEST).send({ Error: err });
    }
    if (userPlaylists) {
      if (userPlaylists.playlists.find((p) => p._id == id)) {
        if (
          !userPlaylists.playlists
            .find((p) => p._id == id)
            .videoIDs.find((v) => v == videoID)
        ) {
          userPlaylists.playlists
            .find((p) => p._id == id)
            .videoIDs.push(videoID);
          userPlaylists.save((err) => {
            if (err)
              return res
                .status(httpStatus.INTERNAL_SERVER_ERROR)
                .send({ Error: err });
            else
              return res.status(httpStatus.OK).send(`Video added to playlist!`);
          });
        } else {
          return res
            .status(httpStatus.BAD_REQUEST)
            .send(`Video already in list!`);
        }
      } else {
        return res.status(httpStatus.BAD_REQUEST).send(`Playlist not found!`);
      }
    } else {
      return res.status(httpStatus.BAD_REQUEST).send("User not found!");
    }
  });
});
router.post("/addToHistory/:id", verifyToken, function (req, res) {
  UserHistory.updateOne(
    { userID: req.userId },
    { $push: { videoIDs: { videoID: req.params.id } } },
    (err, update) => {
      if (err) {
        return res.status(httpStatus.BAD_REQUEST).send(err);
      }
      if (update) {
        return res.status(httpStatus.OK).send(`Added to history`);
      } else {
        return res.status(httpStatus.BAD_REQUEST).send(`User not found`);
      }
    }
  );
});

module.exports = router;
