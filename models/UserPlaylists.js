const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const Schema = mongoose.Schema;

const playlistRowSchema = new Schema({
  videoID: { type: String, required: true },
});

const playlistSchema = new Schema({
  name: { type: String, required: true, minlength: 5 },
  videoIDs: [playlistRowSchema],
});

const userPlaylistsSchema = new Schema({
  userID: {
    type: Schema.ObjectId,
    ref: "User",
  },
  videoIDs: [playlistSchema],
});

userPlaylistsSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("UserPlaylists", userPlaylistsSchema);
