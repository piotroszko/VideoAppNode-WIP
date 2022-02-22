const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const Schema = mongoose.Schema;

const historyRowSchema = new Schema(
  {
    videoID: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);
const userHistorySchema = new Schema({
  userID: {
    type: Schema.ObjectId,
    ref: "User",
    required: true,
  },
  videoIDs: [historyRowSchema],
});

userHistorySchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("UserHistory", userHistorySchema);
