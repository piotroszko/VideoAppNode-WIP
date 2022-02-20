const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const Schema = mongoose.Schema;

const videoSchema = new Schema(
  {
    id: {
      required: true,
      type: String,
      unique: true,
    },
    name: {
      maxlength: 100,
      minlength: 4,
      required: true,
      trim: true,
      type: String,
    },
    description: {
      maxlength: 10000,
      minlength: 0,
      required: false,
      trim: false,
      type: String,
    },
    tags: {
      maxlength: 100,
      minlength: 0,
      required: false,
      type: String,
    },
    userId: {
      lowercase: true,
      maxlength: 255,
      minlength: 5,
      required: true,
      type: String,
      unique: false,
    },
    publicity: {
      type: String,
      enum: ["hidden", "link", "public"],
      default: "hidden",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

videoSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Video", videoSchema);
