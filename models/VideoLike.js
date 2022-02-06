const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const Schema = mongoose.Schema;

const videoLikesSchema = new Schema({
  userID: {
    required: true,
    type: String,
  },
  videoID: {
    required: true,
    type: String,
  },
  likeStatus: {
    type: String,
    enum: ["like", "dislike", "none"],
    default: "none",
    required: true,
  },
});

videoLikesSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("VideoLikes", videoLikesSchema);
