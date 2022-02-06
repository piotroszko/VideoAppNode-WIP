const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const Schema = mongoose.Schema;

const historyRowSchema = new Schema({
  videoID: { type: String, required: true },
  watchDate: { type: Date, required: true },
});
const userHistorySchema = new Schema({
  userID: {
    required: true,
    type: String,
    unique: true,
  },
  videoIDs: [historyRowSchema],
});

userHistorySchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("UserHistory", userHistorySchema);
