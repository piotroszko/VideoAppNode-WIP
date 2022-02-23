const express = require("express");
const router = express.Router();
const config = require("../config/index");
var mongoose = require("mongoose");

const httpStatus = require("../lib/httpStatus");
const verifyToken = require("../lib/verifyToken");

const Video = require("../models/Video");
const Comment = require("../models/Comment");
const CommentLike = require("../models/CommentLike");
const UserPlaylists = require("../models/UserPlaylists");
const UserHistory = require("../models/UserHistory");
const UserDetails = require("../models/UserDetails");

router.get("/all/", verifyToken, async function (req, res) {
  const playlists = await UserPlaylists.findOne({ userID: req.userId });
  return res.status(httpStatus.OK).send(playlists);
});
router.get("/history/", verifyToken, async function (req, res) {
  const history = await UserHistory.find({ userID: req.userId });
  return res.status(httpStatus.OK).send({ history });
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
router.delete("/removePlaylist/:id", verifyToken, function (req, res) {
  const id = req.params.id;
  UserPlaylists.updateOne(
    { userID: req.userId },
    { $pull: { playlists: { _id: id } } },
    (err, userPlaylists) => {
      if (err) {
        return res.status(httpStatus.BAD_REQUEST).send({ Error: err });
      }
      if (userPlaylists) {
        return res.status(httpStatus.OK).send("Playlist removed");
      } else {
        return res.status(httpStatus.OK).send("Playlist not found");
      }
    }
  );
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
      const videoFound = await Video.findOne({ id: videoID }).exec();
      if (!videoFound) {
        return res.status(httpStatus.BAD_REQUEST).send(`Video not found!`);
      }
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
router.delete("/removeFromPlaylist/", verifyToken, async function (req, res) {
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
      const videoFound = await Video.findOne({ id: videoID }).exec();
      if (!videoFound) {
        return res.status(httpStatus.BAD_REQUEST).send(`Video not found!`);
      }
      if (userPlaylists.playlists.find((p) => p._id == id)) {
        if (
          userPlaylists.playlists
            .find((p) => p._id == id)
            .videoIDs.find((v) => v == videoID)
        ) {
          userPlaylists.playlists.find((p) => p._id == id).videoIDs =
            userPlaylists.playlists
              .find((p) => p._id == id)
              .videoIDs.filter((f) => f != videoID);
          userPlaylists.save((err) => {
            if (err)
              return res
                .status(httpStatus.INTERNAL_SERVER_ERROR)
                .send({ Error: err });
            else
              return res.status(httpStatus.OK).send(`Video removed from list!`);
          });
        } else {
          return res.status(httpStatus.BAD_REQUEST).send(`Video not in list!`);
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
router.delete("/removeFromHistory/:id", verifyToken, function (req, res) {
  UserHistory.updateOne(
    { userID: req.userId },
    { $pull: { videoIDs: { videoID: req.params.id } } },
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
