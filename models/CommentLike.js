const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const Schema = mongoose.Schema;

const commentLikeSchema = new Schema({
  commentID: {
    required: true,
    type: String,
  },
  liked: [
    {
      type: Schema.ObjectId,
      ref: "User",
    },
  ],
  disliked: [
    {
      type: Schema.ObjectId,
      ref: "User",
    },
  ],
});

commentLikeSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("CommentLike", commentLikeSchema);
