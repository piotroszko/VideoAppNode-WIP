const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const Schema = mongoose.Schema;

const userDetailsSchema = new Schema({
  userID: {
    type: Schema.ObjectId,
    ref: "User",
    required: true,
  },
  sendEmailOnComLike: {
    required: true,
    type: Boolean,
    default: false,
  },
  sendEmailOnNewVideo: {
    required: true,
    type: Boolean,
    default: false,
  },
  subscribedToUsers: [
    {
      type: Schema.ObjectId,
      ref: "User",
    },
  ],
});

userDetailsSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("UserDetails", userDetailsSchema);
