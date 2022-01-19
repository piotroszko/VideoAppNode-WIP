const express = require('express');
const router = express.Router();
const httpStatus = require('../lib/httpStatus');
const jwtModule = require('../lib/jwtModule');
const verifyToken = require('../lib/verifyToken');
const Video = require('../models/Video');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/index');
const formidable = require('express-formidable');
const { readdirSync, renameSync } = require('fs');
const path = require('path');
const { customAlphabet } = require('nanoid');

router.get('/v/:id', function(req, res) {
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

router.post('/createVideo', verifyToken, async function(req, res, next) {
  const {application, name, description, tags} = req.body;
  if (!application || !name || !description || !tags) {
    return res.status(httpStatus.BAD_REQUEST).send({ auth: false, error: 'Invalid parameters in request' });
  }
  const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789-_', 12);
  let nid = nanoid();
  function recreateTillUnique() {
    Video.find({id:nid},(err,data)=>{
      if(err)throw err;
      if(data.length != 0){ 
        nid = nanoid();
        recreateTillUnique();
      }
    });
  }
  recreateTillUnique();
  Video.create({
    id: nid,
    name : name,
    description : description,
    tags : tags,
    userId: req.userId,
    publicity: 'hidden'
  },
  function (error, video) {
    if (error) {
      const message = `Server error: ${error.message}`
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ videoCreation: false, error: message });
    }
    res.status(httpStatus.OK).send({ videoCreation: true, video });
  });
});

router.post('/uploadVideoFile', verifyToken, formidable({ uploadDir: path.join('./','public', 'videos'), keepExtensions: true }), async (req, res) => {
  const {videoId} = req.fields;
  const file = req.files.file;
  if(!(file.type.match('video.*'))) {
    return res.status(httpStatus.BAD_REQUEST).send(' Bad file type. Expected video type, got: ' + file.type.ToString());
  }
  Video.find({id:videoId, userId: req.userId},(err,data)=>{
    if(err)throw err;
    if(data.length != 0){ 
      renameSync(file.path, path.join('./','public', 'videos', videoId + path.parse(file.name).ext));
      Video.find({id:videoId, userId: req.userId}, {sourceUrl: 'videos/'+ videoId + path.parse(file.name).ext});
    }
  });
  res.status(httpStatus.OK);
});

module.exports = router;
