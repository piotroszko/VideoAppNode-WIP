const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const Schema = mongoose.Schema;

const commentSchema = new Schema(
  {
    userID: {
      required: true,
      type: String,
    },
    videoID: {
      required: true,
      type: String,
    },
    title: {
      type: String,
      default: "",
      minlength: 0,
    },
    content: {
      type: String,
      default: "",
      minlength: 0,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Comment", commentSchema);
