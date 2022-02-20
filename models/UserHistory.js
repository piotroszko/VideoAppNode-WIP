const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const Schema = mongoose.Schema;

const historyRowSchema = new Schema(
  {
    videoID: { type: String, required: true },
    watchDate: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);
const userHistorySchema = new Schema({
  userID: {
    type: Schema.ObjectId,
    ref: "User",
  },
  videoIDs: [historyRowSchema],
});

userHistorySchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("UserHistory", userHistorySchema);
