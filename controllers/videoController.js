const express = require('express');
const router = express.Router();
const httpStatus = require('../lib/httpStatus');
const jwtModule = require('../lib/jwtModule');
const verifyToken = require('../lib/verifyToken');
const Video = require('../models/Video');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/index');

router.get('/:id', function(req, res) {
  Video.findById(req.params.id, function (error, video) {
    if (error) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).send(`Server error: ${error.message}`);
    }
    if (video) {
      res.status(httpStatus.OK).send({id: video.id, name: video.name, sourceUrl: video.sourceUrl, thumbnailUrl: video.thumbnailUrl, userId: video.userId});
    } else {
      return res.status(httpStatus.NOT_FOUND).send(`Video not found (_id: ${req.videoId})`);
    }
  });
});

module.exports = router;
