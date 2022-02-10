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
const VideoLikes = require("../models/VideoLike");
const VideoStats = require("../models/VideoStats");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const ffprobe = require("@ffprobe-installer/ffprobe");
const ffmpeg = require("fluent-ffmpeg")()
  .setFfprobePath(ffprobe.path)
  .setFfmpegPath(ffmpegInstaller.path);

router.get("/v/:id", function (req, res) {
  Video.findOne({ id: req.params.id }, function (error, video) {
    if (error) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send(`Server error: ${error.message}`);
    }
    if (video) {
      res.status(httpStatus.OK).send({
        id: video.id,
        name: video.name,
        description: video.description,
        userId: video.userId,
      });
    } else {
      return res
        .status(httpStatus.NOT_FOUND)
        .send(`Video not found (_id: ${req.videoId})`);
    }
  });
});

router.get("/vs/", async function (req, res) {
  const videoFind = await Video.find({ publicity: "public" })
    .sort("name")
    .limit(10);
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
  }));
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
        .send(
          " Bad file type. Expected video type, got: " + file.type.ToString()
        );
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
        ffmpeg
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
        await Video.findOne(
          { id: videoId, userId: req.userId },
          function (err, vid) {
            vid.sourceUrl = "videos/" + videoId + path.parse(file.name).ext;
            vid.save();
          }
        );
        return res.status(httpStatus.OK);
      }
    });
    return res.status(httpStatus.OK);
  }
);

router.get("/like/:id", verifyToken, function (req, res) {
  Video.findOne({ id: req.params.id }, function (err, video) {
    if (err) {
      return res.status(httpStatus.BAD_REQUEST).send(err);
    }
    if (video) {
      VideoLikes.findOne(
        { videoID: req.params.id, userID: req.userId },
        function (err, item) {
          if (err) {
            return res.status(httpStatus.BAD_REQUEST).send(" Server error ");
          }
          if (item) {
            return res
              .status(httpStatus.OK)
              .send({ likeStatus: item.likeStatus });
          } else {
            return res.status(httpStatus.OK).send({ likeStatus: "none" });
          }
        }
      );
    } else {
      return res.status(httpStatus.BAD_REQUEST).send("Not found");
    }
  });
});
router.post("/like/:id", verifyToken, function (req, res) {
  Video.findOne({ id: req.params.id }, function (err, video) {
    if (err) {
      return res.status(httpStatus.BAD_REQUEST).send(err);
    }
    if (video) {
      VideoLikes.updateOne(
        { videoID: req.params.id, userID: req.userId },
        { videoID: req.params.id, userID: req.userId, likeStatus: "like" },
        { upsert: true },
        function (err, response) {
          if (err) {
            return res.status(httpStatus.BAD_REQUEST).send(" Server error ");
          }
          if (response) {
            VideoStats.findOne(
              { _id: req.params.id },
              function (err, videoStats) {
                videoStats.likes = videoStats.likes + 1;
                videoStats.save();
              }
            );
            res.status(httpStatus.OK).send({ likeStatus: "like" });
          } else {
            return res.status(httpStatus.BAD_REQUEST).send(" Bad request ");
          }
        }
      );
    } else {
      return res.status(httpStatus.BAD_REQUEST).send("Not found");
    }
  });
});
router.post("/unlike/:id", verifyToken, function (req, res) {
  Video.findOne({ id: req.params.id }, function (err, video) {
    if (err) {
      return res.status(httpStatus.BAD_REQUEST).send(err);
    }
    if (video) {
      VideoLikes.updateOne(
        { videoID: req.params.id, userID: req.userId },
        { videoID: req.params.id, userID: req.userId, likeStatus: "none" },
        { upsert: true },
        function (err, response) {
          if (err) {
            return res.status(httpStatus.BAD_REQUEST).send(" Server error ");
          }
          if (response) {
            if (response.likeStaus === "like") {
              VideoStats.findOne(
                { _id: req.params.id },
                function (err, videoStats) {
                  videoStats.likes = videoStats.likes - 1;
                  videoStats.save();
                }
              );
            } else if (response.likeStaus === "dislike") {
              VideoStats.findOne(
                { _id: req.params.id },
                function (err, videoStats) {
                  videoStats.dislikes = videoStats.dislikes - 1;
                  videoStats.save();
                }
              );
            }
            res.status(httpStatus.OK).send({ likeStatus: "none" });
          } else {
            return res.status(httpStatus.BAD_REQUEST).send(" Bad request ");
          }
        }
      );
    } else {
      return res.status(httpStatus.BAD_REQUEST).send("Not found");
    }
  });
});
router.post("/dislike/:id", verifyToken, function (req, res) {
  Video.findOne({ id: req.params.id }, function (err, video) {
    if (err) {
      return res.status(httpStatus.BAD_REQUEST).send(err);
    }
    if (video) {
      VideoLikes.updateOne(
        { videoID: req.params.id, userID: req.userId },
        { videoID: req.params.id, userID: req.userId, likeStatus: "dislike" },
        { upsert: true },
        function (err, response) {
          if (err) {
            return res.status(httpStatus.BAD_REQUEST).send(" Server error ");
          }
          if (response) {
            VideoStats.findOne(
              { _id: req.params.id },
              function (err, videoStats) {
                videoStats.dislikes = videoStats.dislikes + 1;
                videoStats.save();
              }
            );
            return res.status(httpStatus.OK).send({ likeStatus: "dislike" });
          } else {
            return res.status(httpStatus.BAD_REQUEST).send(" Bad request ");
          }
        }
      );
    } else {
      return res.status(httpStatus.BAD_REQUEST).send("Not found");
    }
  });
});

module.exports = router;
