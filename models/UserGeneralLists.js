const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const Schema = mongoose.Schema;

const videoRowSchema = new Schema(
  {
    videoID: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);
const userGeneralListsSchema = new Schema({
  userID: {
    type: Schema.ObjectId,
    ref: "User",
    required: true,
  },
  history: [videoRowSchema],
  toWatch: [videoRowSchema],
});

userGeneralListsSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("UserGeneralLists", userGeneralListsSchema);
