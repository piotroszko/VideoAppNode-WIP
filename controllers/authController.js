const express = require("express");
const router = express.Router();
const httpStatus = require("../lib/httpStatus");
const jwtModule = require("../lib/jwtModule");
const verifyToken = require("../lib/verifyToken");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../config/index");
const UserPlaylists = require("../models/UserPlaylists");
const UserHistory = require("../models/UserHistory");
const UserDetails = require("../models/UserDetails");

router.post("/login", function (req, res) {
  const { application, email, password } = req.body;
  if (!application || !email || !password) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .send({ auth: false, error: "Invalid parameters in request" });
  }
  User.findOne({ email }, function (error, user) {
    if (error) {
      const message = `Server error: ${error.message}`;
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ auth: false, error: message });
    } else {
      if (user) {
        const { _id, email, password } = user;
        const passwordMatch = bcrypt.compareSync(req.body.password, password);
        if (passwordMatch) {
          // sign and return a new token
          const payload = { id: _id };
          const signingOptions = {
            subject: email,
            audience: application,
          };
          const signedToken = jwtModule.sign(payload, signingOptions);
          return res
            .status(httpStatus.OK)
            .send({ auth: true, token: signedToken });
        } else {
          return res
            .status(httpStatus.UNAUTHORIZED)
            .send({ auth: false, token: null });
        }
      } else {
        const message = `User not found (email: ${req.body.email})`;
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ auth: false, error: message });
      }
    }
  });
});

router.get("/refreshtoken", verifyToken, function (req, res, next) {
  const audience = req.query.application;
  User.findById(req.userId, { password: 0 }, function (error, user) {
    if (error) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send(`Server error: ${error.message}`);
    }
    if (user) {
      res.status(httpStatus.OK).send({
        token: jwtModule.sign(
          { id: user._id },
          { subject: user.email, audience: audience }
        ),
      });
    } else {
      return res
        .status(httpStatus.NOT_FOUND)
        .send(`User not found (_id: ${req.userId})`);
    }
  });
});

router.post("/register", function (req, res) {
  const { application, email, name, password } = req.body;
  if (!application || !email || !name || !password) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .send({ registered: false, error: "Invalid parameters in request" });
  }
  const hashedPassword = bcrypt.hashSync(req.body.password, 8);
  User.create(
    {
      name: name,
      email: email,
      password: hashedPassword,
    },
    function (error, user) {
      if (error) {
        const message = `Server error: ${error.message}`;
        return res
          .status(httpStatus.INTERNAL_SERVER_ERROR)
          .send({ registered: false, error: message });
      }
      // if user created, return a signed token
      const payload = { id: user._id };
      const options = { subject: email, audience: application };
      const signedToken = jwtModule.sign(payload, options);
      UserPlaylists.create({ userID: req.userId });
      UserHistory.create({ userID: req.userId });
      UserDetails.create({ userID: req.userId });
      res.status(httpStatus.OK).send({ registered: true, token: signedToken });
    }
  );
});

router.get("/me", verifyToken, function (req, res, next) {
  User.findById(req.userId, { password: 0 }, function (error, user) {
    if (error) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send(`Server error: ${error.message}`);
    }
    if (user) {
      res
        .status(httpStatus.OK)
        .send({ id: user.id, email: user.email, name: user.name });
    } else {
      return res
        .status(httpStatus.NOT_FOUND)
        .send(`User not found (_id: ${req.userId})`);
    }
  });
});
router.post("/changePassword", verifyToken, function (req, res) {
  const { password, newPassword } = req.body;
  if (!password || !newPassword) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .send({ auth: false, error: "Invalid parameters in request" });
  }
  User.findOne({ _id: req.userId }, function (error, user) {
    if (error) {
      const message = `Server error: ${error.message}`;
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ auth: false, error: message });
    } else {
      if (user) {
        const passwordMatch = bcrypt.compareSync(password, user.password);
        if (passwordMatch) {
          const hashedPassword = bcrypt.hashSync(newPassword, 8);
          user.password = hashedPassword;
          user.save();
          return res.status(httpStatus.OK).send("Password changed!");
        } else {
          return res.status(httpStatus.UNAUTHORIZED).send("Wrong password!");
        }
      } else {
        const message = `User not found)`;
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ auth: false, error: message });
      }
    }
  });
});

module.exports = router;
