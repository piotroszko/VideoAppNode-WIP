const express = require("express");
const router = express.Router();
const httpStatus = require("../lib/httpStatus");
const jwtModule = require("../lib/jwtModule");
const verifyToken = require("../lib/verifyToken");
const Video = require("../models/Video");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../config/index");
const formidable = require("express-formidable");
const { readdirSync, renameSync } = require("fs");
const path = require("path");
const { customAlphabet } = require("nanoid");
const VideoStats = require("../models/VideoStats");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const ffprobe = require("@ffprobe-installer/ffprobe");
const ffmpeg = require("fluent-ffmpeg")()
  .setFfprobePath(ffprobe.path)
  .setFfmpegPath(ffmpegInstaller.path);

const limit = 20;

router.get("/v/:id", async function (req, res) {
  try {
    const video = await Video.findOne({ id: req.params.id });
    const user = await User.findOne({ _id: video.userId });
    const videoStats = await VideoStats.findOne({ videoID: req.params.id });
    const videoObject = {
      id: video.id,
      name: video.name,
      description: video.description,
      tags: video.tags,
      userId: video.userId,
      channelName: user.name,
      views: videoStats.views,
      likes: videoStats.liked.length,
      dislikes: videoStats.disliked.length,
    };
    return res.status(httpStatus.OK).send(videoObject);
  } catch (err) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send(`Server error: ${err}`);
  }
});
router.get("/recommended/:id/:page?", async function (req, res) {
  let videoFind = [];
  const videoID = req.params.id;
  const page = req.params.page ? req.params.page : 0;
  try {
    const video = await Video.findOne({ id: videoID });

    videoFind = await Video.find({
      id: { $ne: videoID },
      publicity: "public",
      tags: { $in: video.tags },
    })
      .limit(limit)
      .skip(limit * page);
    if (videoFind.length === 0) {
      return res.status(httpStatus.OK).send({ videoFind });
    }

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

    return res
      .status(httpStatus.OK)
      .send(videos.sort((a, b) => b.views - a.views));
  } catch (err) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send(`Server error: ${err}`);
  }
});

router.post("/viewed/:id", async function (req, res) {
  VideoStats.findOne({ videoID: req.params.id }, function (error, stats) {
    if (error) {
      const message = `Server error: ${error.message}`;
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ videoStats: false, error: message });
    }
    if (stats) {
      stats.views = stats.views + 1;
      stats.save();
      res.status(httpStatus.OK).send({ videoStats: true });
    } else {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ videoStats: false });
    }
  });
});

router.post("/vs/", async function (req, res) {
  let videoFind = [];
  const searchText = req.body.name ? req.body.name : "";
  const page = req.body.page ? req.body.page : 0;
  if (req.body.filter) {
    if (req.body.filter === "name") {
      videoFind = await Video.find({
        publicity: "public",
        name: { $regex: searchText, $options: "i" },
      })
        .sort("name")
        .limit(limit)
        .skip(page * limit);
    } else if (req.body.filter === "date") {
      videoFind = await Video.find({
        publicity: "public",
        name: { $regex: searchText, $options: "i" },
      })
        .sort("createdAt")
        .limit(limit)
        .skip(page * limit);
    } else if (req.body.filter === "channel" && req.body.id) {
      videoFind = await Video.find({
        publicity: "public",
        userId: req.body.id,
        name: { $regex: searchText, $options: "i" },
      }).sort("createdAt");
    } else {
      videoFind = await Video.find({
        publicity: "public",
        name: { $regex: searchText, $options: "i" },
      })
        .sort("name")
        .limit(limit)
        .skip(page * limit);
    }
  } else {
    videoFind = await Video.find({
      publicity: "public",
      name: { $regex: searchText, $options: "i" },
    })
      .sort("name")
      .limit(limit)
      .skip(page * limit);
  }
  if (videoFind.length === 0) {
    return res.status(httpStatus.OK).send({ videoFind });
  }
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
  if (req.body.filter) {
    if (req.body.filter === "views") {
      videos.sort((a, b) => b.views - a.views);
    }
  }
  return res.status(httpStatus.OK).send({ videos });
});

router.post("/createVideo", verifyToken, async function (req, res, next) {
  const { application, name, description, tags } = req.body;
  if (!application || !name || !description || !tags) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .send({ auth: false, error: "Invalid parameters in request" });
  }
  const nanoid = customAlphabet(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789-_",
    12
  );
  let nid = nanoid();
  function recreateTillUnique() {
    Video.find({ id: nid }, (err, data) => {
      if (err) throw err;
      if (data.length != 0) {
        nid = nanoid();
        recreateTillUnique();
      }
    });
  }
  recreateTillUnique();
  Video.create(
    {
      id: nid,
      name: name,
      description: description,
      tags: tags,
      userId: req.userId,
      publicity: "hidden",
    },
    function (error, video) {
      if (error) {
        const message = `Server error: ${error.message}`;
        return res
          .status(httpStatus.INTERNAL_SERVER_ERROR)
          .send({ videoCreation: false, error: message });
      }
      VideoStats.create({ videoID: nid });
      res.status(httpStatus.OK).send({ videoCreation: true, video });
    }
  );
});

router.post(
  "/uploadVideoFile",
  verifyToken,
  formidable({
    uploadDir: path.join("./", "public", "videos"),
    keepExtensions: true,
  }),
  async (req, res) => {
    const { videoId } = req.fields;
    const file = req.files.file;
    if (!file.type.match("video.*")) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send(" Bad file type. Expected video type. ");
    }
    Video.find({ id: videoId, userId: req.userId }, async (err, data) => {
      if (err) throw err;
      if (data.length != 0) {
        renameSync(
          file.path,
          path.join(
            "./",
            "public",
            "videos",
            videoId + path.parse(file.name).ext
          )
        );
        const ffmpegInstance = require("fluent-ffmpeg")()
          .setFfprobePath(ffprobe.path)
          .setFfmpegPath(ffmpegInstaller.path);
        ffmpegInstance
          .input(
            path.join(
              "./",
              "public",
              "videos",
              videoId + path.parse(file.name).ext
            )
          )
          .autopad([(color = "black")])
          .screenshots({
            timestamps: ["30%"],
            filename: videoId + ".png",
            folder: path.join("./", "public", "info", "thumbnails"),
            size: "320x180",
          })
          .videoFilters([
            {
              filter: "setpts",
              options: "2*PTS",
            },
            {
              filter: "fps",
              options: "1",
            },
            {
              filter: "pad",
              options: "ih*16/9:ih:(ow-iw)/2:(oh-ih)/2",
            },
            {
              filter: "scale",
              options: "320x180",
            },
          ])
          .output(
            path.join("./", "public", "info", "preview", videoId + ".gif")
          );
        return res.status(httpStatus.OK).send(data);
      }
    });
    return res.status(httpStatus.BAD_REQUEST).send("Video not found");
  }
);

router.get("/like/:id", verifyToken, function (req, res) {
  VideoStats.findOne({ videoID: req.params.id }, function (err, videoStats) {
    if (err) {
      return res.status(httpStatus.BAD_REQUEST).send(err);
    }
    if (videoStats) {
      if (videoStats.liked.includes(req.userId)) {
        return res.status(httpStatus.OK).send({ likeStatus: "like" });
      } else if (videoStats.disliked.includes(req.userId)) {
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
  VideoStats.findOne({ videoID: req.params.id }, function (err, videoStats) {
    if (err) {
      return res.status(httpStatus.BAD_REQUEST).send(err);
    }
    if (videoStats) {
      if (videoStats.liked.includes(req.userId)) {
        return res.status(httpStatus.OK).send({ likeStatus: "like" });
      } else if (videoStats.disliked.includes(req.userId)) {
        videoStats.disliked = videoStats.disliked.filter(
          (i) => i === req.userId
        );
        videoStats.liked.push(req.userId);
        videoStats.save();
        return res.status(httpStatus.OK).send({ likeStatus: "like" });
      } else {
        videoStats.liked.push(req.userId);
        videoStats.save();
        return res.status(httpStatus.OK).send({ likeStatus: "like" });
      }
    } else {
      return res.status(httpStatus.BAD_REQUEST).send("Not found");
    }
  });
});
router.post("/unlike/:id", verifyToken, function (req, res) {
  VideoStats.findOne({ videoID: req.params.id }, function (err, videoStats) {
    if (err) {
      return res.status(httpStatus.BAD_REQUEST).send(err);
    }
    if (videoStats) {
      videoStats.liked = videoStats.liked.filter((i) => i === req.userId);
      videoStats.disliked = videoStats.disliked.filter((i) => i === req.userId);
      videoStats.save();
      return res.status(httpStatus.OK).send({ likeStatus: "none" });
    } else {
      return res.status(httpStatus.BAD_REQUEST).send("Not found");
    }
  });
});
router.post("/dislike/:id", verifyToken, function (req, res) {
  VideoStats.findOne({ videoID: req.params.id }, function (err, videoStats) {
    if (err) {
      return res.status(httpStatus.BAD_REQUEST).send(err);
    }
    if (videoStats) {
      if (videoStats.disliked.includes(req.userId)) {
        return res.status(httpStatus.OK).send({ likeStatus: "dislike" });
      } else if (videoStats.liked.includes(req.userId)) {
        videoStats.liked = videoStats.liked.filter((i) => i === req.userId);
        videoStats.disliked.push(req.userId);
        videoStats.save();
        return res.status(httpStatus.OK).send({ likeStatus: "dislike" });
      } else {
        videoStats.disliked.push(req.userId);
        videoStats.save();
        return res.status(httpStatus.OK).send({ likeStatus: "dislike" });
      }
    } else {
      return res.status(httpStatus.BAD_REQUEST).send("Not found");
    }
  });
});
router.get("/my/", verifyToken, async function (req, res) {
  try {
    const videoFind = await Video.find({ userId: req.userId });
    if (videoFind.length === 0) {
      return res.status(httpStatus.OK).send({ videoFind });
    }
    const stats = await VideoStats.find({
      $or: videoFind.map((v) => ({
        videoID: v.id,
      })),
    });
    const videos = videoFind.map((v) => ({
      id: v.id,
      userId: v.userId,
      name: v.name,
      description: v.description,
      tags: v.tags,
      views: stats.find((s) => s.videoID == v.id).views,
      likes: stats.find((s) => s.videoID == v.id).liked.length,
      dislikes: stats.find((s) => s.videoID == v.id).disliked.length,
      publicity: v.publicity,
      createdAt: v.createdAt,
    }));
    return res.status(httpStatus.OK).send(videos);
  } catch (err) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send(`Server error: ${err}`);
  }
});
router.get("/suggest/:text", async function (req, res) {
  try {
    const videoFind = await Video.find({
      publicity: "public",
      name: { $regex: req.params.text, $options: "i" },
    }).select("name id -_id");
    if (videoFind.length === 0) {
      return res.status(httpStatus.OK).send({ videoFind });
    }
    const stats = await VideoStats.find({
      $or: videoFind.map((v) => ({
        videoID: v.id,
      })),
    });
    const videos = videoFind
      .map((v) => ({
        name: v.name,
        views: stats.find((f) => f.videoID === v.id).views,
        id: v.id,
      }))
      .sort((a, b) => b - a)
      .filter((f, index) => index <= 10);

    return res
      .status(httpStatus.OK)
      .send(videos.map((v) => ({ name: v.name, id: v.id })));
  } catch (err) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send(`Server error: ${err}`);
  }
});

module.exports = router;
