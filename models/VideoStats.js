const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const Schema = mongoose.Schema;

const videoStatSchema = new Schema({
  videoID: {
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
  views: {
    type: Number,
    default: 0,
  },
});

videoStatSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("VideoStats", videoStatSchema);
