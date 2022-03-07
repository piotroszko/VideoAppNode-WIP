const express = require("express");
const router = express.Router();
const config = require("../config/index");
var mongoose = require("mongoose");

const httpStatus = require("../lib/httpStatus");
const verifyToken = require("../lib/verifyToken");

const User = require("../models/User");
const Video = require("../models/Video");
const VideoStats = require("../models/VideoStats");
const Comment = require("../models/Comment");
const CommentLike = require("../models/CommentLike");
const UserPlaylists = require("../models/UserPlaylists");
const UserGeneralLists = require("../models/UserGeneralLists");
const UserDetails = require("../models/UserDetails");

router.get("/all/", verifyToken, async function (req, res) {
  const playlists = await UserPlaylists.findOne({ userID: req.userId });
  return res.status(httpStatus.OK).send(playlists);
});
router.get("/history/", verifyToken, async function (req, res) {
  const generalLists = await UserGeneralLists.findOne({ userID: req.userId });
  if (generalLists.history.length === 0) {
    return res.status(httpStatus.OK).send([]);
  }
  const videoFind = await Video.find({
    $or: generalLists.history.map((v) => ({
      id: v.videoID,
    })),
  });

  const stats = await VideoStats.find({
    $or: videoFind.map((v) => ({
      videoID: v.id,
    })),
  });
  const channels = await User.find({
    $or: videoFind.map((v) => ({
      _id: v.userId,
    })),
  });
  const videos = videoFind.map((v) => ({
    id: v.id,
    userId: v.userId,
    channelName: channels.find((c) => c._id == v.userId).name,
    name: v.name,
    description: v.description,
    tags: v.tags,
    views: stats.find((s) => s.videoID == v.id).views,
    createdAt: v.createdAt,
  }));
  const history = generalLists.history.map((v) => ({
    _id: v._id,
    watchedAt: v.createdAt,
    video: videos.find((w) => w.id == v.videoID),
  }));
  return res.status(httpStatus.OK).send(history);
});
router.get("/toWatch/", verifyToken, async function (req, res) {
  const generalLists = await UserGeneralLists.findOne({ userID: req.userId });
  if (generalLists.toWatch.length === 0) {
    return res.status(httpStatus.OK).send([]);
  }
  const videoFind = await Video.find({
    $or: generalLists.toWatch.map((v) => ({
      id: v.videoID,
    })),
  });

  const stats = await VideoStats.find({
    $or: videoFind.map((v) => ({
      videoID: v.id,
    })),
  });
  const channels = await User.find({
    $or: videoFind.map((v) => ({
      _id: v.userId,
    })),
  });
  const videos = videoFind.map((v) => ({
    id: v.id,
    userId: v.userId,
    channelName: channels.find((c) => c._id == v.userId).name,
    name: v.name,
    description: v.description,
    tags: v.tags,
    views: stats.find((s) => s.videoID == v.id).views,
    createdAt: v.createdAt,
  }));
  const toWatch = generalLists.toWatch.map((v) => ({
    _id: v._id,
    watchedAt: v.createdAt,
    video: videos.find((w) => w.id == v.videoID),
  }));
  return res.status(httpStatus.OK).send(toWatch);
});
router.get("/playlist/:id", verifyToken, async function (req, res) {
  const playlistsObject = await UserPlaylists.findOne({ userID: req.userId });
  const playlist = playlistsObject.playlists.find(
    (pl) => pl._id == req.params.id
  );
  if (playlist.videoIDs.length === 0) {
    return res.status(httpStatus.OK).send([]);
  }
  const videos = await Video.find({
    $or: playlist.videoIDs.map((v) => ({
      id: v,
    })),
  });
  const stats = await VideoStats.find({
    $or: videos.map((v) => ({
      videoID: v.id,
    })),
  });
  const channels = await User.find({
    $or: videos.map((v) => ({
      _id: v.userId,
    })),
  });
  const playlistVideos = videos.map((v) => ({
    id: v.id,
    userId: v.userId,
    channelName: channels.find((c) => c._id == v.userId).name,
    name: v.name,
    description: v.description,
    tags: v.tags,
    views: stats.find((s) => s.videoID == v.id).views,
    createdAt: v.createdAt,
  }));
  return res.status(httpStatus.OK).send(playlistVideos);
});
router.post("/addPlaylist/", verifyToken, async function (req, res) {
  const { name } = req.body;
  if (!name) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .send({ error: "Invalid parameters in request" });
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
      .send({ error: "Invalid parameters in request" });
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
router.delete(
  "/removeFromPlaylist/:id/:videoID",
  verifyToken,
  async function (req, res) {
    const id = req.params.id;
    const videoID = req.params.videoID;
    if (!id || !videoID) {
      return res.status(httpStatus.BAD_REQUEST).send({
        error: `Invalid parameters in request id:${id && id}, videoID:${
          videoID && videoID
        }`,
      });
    }
    UserPlaylists.findOne(
      { userID: req.userId },
      async (err, userPlaylists) => {
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
                  return res
                    .status(httpStatus.OK)
                    .send(`Video removed from list!`);
              });
            } else {
              return res
                .status(httpStatus.BAD_REQUEST)
                .send(`Video not in list!`);
            }
          } else {
            return res
              .status(httpStatus.BAD_REQUEST)
              .send(`Playlist not found!`);
          }
        } else {
          return res.status(httpStatus.BAD_REQUEST).send("User not found!");
        }
      }
    );
  }
);
router.post("/addToHistory/:id", verifyToken, function (req, res) {
  UserGeneralLists.updateOne(
    { userID: req.userId },
    { $push: { history: { videoID: req.params.id } } },
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
  UserGeneralLists.updateOne(
    { userID: req.userId },
    { $pull: { history: { _id: req.params.id } } },
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
router.post("/addToWatch/:id", verifyToken, function (req, res) {
  UserGeneralLists.updateOne(
    { userID: req.userId },
    { $push: { toWatch: { videoID: req.params.id } } },
    (err, update) => {
      if (err) {
        return res.status(httpStatus.BAD_REQUEST).send(err);
      }
      if (update) {
        return res.status(httpStatus.OK).send(`Added to "to watch"`);
      } else {
        return res.status(httpStatus.BAD_REQUEST).send(`User not found`);
      }
    }
  );
});
router.delete("/removeFromToWatch/:id", verifyToken, function (req, res) {
  UserGeneralLists.updateOne(
    { userID: req.userId },
    { $pull: { toWatch: { _id: req.params.id } } },
    (err, update) => {
      if (err) {
        return res.status(httpStatus.BAD_REQUEST).send(err);
      }
      if (update) {
        return res.status(httpStatus.OK).send(`Removed from "to watch"`);
      } else {
        return res.status(httpStatus.BAD_REQUEST).send(`User not found`);
      }
    }
  );
});

module.exports = router;
