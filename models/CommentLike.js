const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const Schema = mongoose.Schema;

const commentLikeSchema = new Schema({
  userID: {
    required: true,
    type: String,
  },
  commentID: {
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

commentLikeSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("CommentLike", commentLikeSchema);
