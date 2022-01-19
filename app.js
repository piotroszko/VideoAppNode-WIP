require('rootpath')();
const express = require('express');
const app = express();
require('./db');
const httpStatus = require('./lib/httpStatus')
const bodyParser = require('body-parser')

// configure the app to use bodyParser()
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

app.get('/api/v1', function (req, res) {
  res.status(httpStatus.OK).send('API v1 running');
});

const userController = require('controllers/userController');
app.use('/api/v1/users', userController);

const authController = require('controllers/authController');
app.use('/api/v1/authentication', authController);

const videoController = require('controllers/videoController');
app.use('/api/v1/video', videoController);

app.use(express.static('public'));

module.exports = app;
