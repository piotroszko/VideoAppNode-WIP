const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const Schema = mongoose.Schema;

const videoStatSchema = new Schema({
  videoID: {
    required: true,
    type: String,
  },
  likes: {
    type: Number,
    default: 0,
  },
  dislikes: {
    type: Number,
    default: 0,
  },
  views: {
    type: Number,
    default: 0,
  },
});

videoStatSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("VideoStats", videoStatSchema);
