const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const Schema = mongoose.Schema;

const playlistSchema = new Schema({
  name: { type: String, required: true, minlength: 5 },
  videoIDs: [
    {
      required: true,
      type: String,
    },
  ],
});

const userPlaylistsSchema = new Schema({
  userID: {
    type: Schema.ObjectId,
    ref: "User",
    required: true,
  },
  playlists: [playlistSchema],
});

userPlaylistsSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("UserPlaylists", userPlaylistsSchema);
