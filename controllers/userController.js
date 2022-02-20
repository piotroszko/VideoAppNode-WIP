const express = require("express");
const router = express.Router();
const httpStatus = require("lib/httpStatus");
const User = require("../models/User");
const verifyToken = require("../lib/verifyToken");
const formidable = require("express-formidable");
const { readdirSync, renameSync, unlinkSync, existsSync } = require("fs");
const path = require("path");

router.post("/", function (req, res) {
  User.create(
    {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
    },
    function (err, user) {
      if (err)
        return res
          .status(httpStatus.INTERNAL_SERVER_ERROR)
          .send(`Server error: ${err.message}`);
      res.status(httpStatus.OK).send(user);
    }
  );
});

router.get("/", function (req, res) {
  User.find({}, function (err, users) {
    if (err)
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send(`Server error: ${err.message}`);
    res.status(httpStatus.OK).send(users);
  })
    .select("-password -__v")
    .sort({ name: 1 });
});

router.get("/:id", function (req, res) {
  User.findById(req.params.id, function (err, user) {
    if (err)
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send(`Server error: ${err.message}`);
    if (!user) return res.status(httpStatus.NOT_FOUND).send("User not found");
    res.status(httpStatus.OK).send(user);
  }).select("-password -__v");
});

router.delete("/:id", function (req, res) {
  User.findByIdAndRemove(req.params.id, function (err, user) {
    if (err)
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send(`Server error: ${err.message}`);
    res.status(httpStatus.OK).send("User: " + user.name + " was deleted.");
  });
});

router.put("/:id", function (req, res) {
  User.findByIdAndUpdate(
    req.params.id,
    {
      $set: { email: req.body.email, name: req.body.name },
    },
    { new: false },
    function (err, user) {
      if (err)
        return res
          .status(httpStatus.INTERNAL_SERVER_ERROR)
          .send(`Server error: ${err.message}`);
      res.status(httpStatus.NO_CONTENT).send(user);
    }
  );
});
router.post(
  "/uploadPicture",
  verifyToken,
  formidable({
    uploadDir: path.join("./", "public", "users"),
    keepExtensions: true,
  }),
  (req, res) => {
    const file = req.files.file;
    if (path.extname(file.path) !== ".png") {
      unlinkSync(file.path);
      return res
        .status(httpStatus.BAD_REQUEST)
        .send(" Bad file type. Expected image type.");
    } else {
      try {
        renameSync(
          file.path,
          path.join(
            "./",
            "public",
            "users",
            req.userId + path.parse(file.name).ext
          )
        );
        return res.status(httpStatus.OK).send("Avatar successfully uploaded!");
      } catch (err) {
        return res
          .status(httpStatus.INTERNAL_SERVER_ERROR)
          .send(`Server error: ${err.message}`);
      }
    }
  }
);
router.get("/avatar/:id", (req, res) => {
  const id = req.params.id;
  if (existsSync(path.join("./", "public", "users", req.params.id + ".png"))) {
    return res
      .status(httpStatus.OK)
      .send(path.join("./", "users", req.params.id + ".png"));
  } else {
    return res
      .status(httpStatus.OK)
      .send(path.join("./", "users", "defaultAvatar.png"));
  }
});

module.exports = router;
