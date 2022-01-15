const mongoose = require('mongoose');
mongoose.set('useFindAndModify', false);
const Schema = mongoose.Schema;

const videoSchema = new Schema({
  name: {
    maxlength: 100,
    minlength: 4,
    required: true,
    trim: true,
    type: String
  },
  sourceUrl: {
    lowercase: true,
    maxlength: 255,
    minlength: 5,
    required: true,
    trim: true,
    type: String,
    unique: true
  },
  thumbnailUrl: {
    lowercase: true,
    maxlength: 255,
    minlength: 5,
    required: true,
    trim: true,
    type: String,
    unique: true
  },
  userId: {
    lowercase: true,
    maxlength: 255,
    minlength: 5,
    required: true,
    trim: true,
    type: String,
    unique: false
  },
});


videoSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Video', videoSchema);
