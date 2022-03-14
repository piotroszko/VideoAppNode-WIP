const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const Schema = mongoose.Schema;

const tokenSchema = new Schema(
  {
    userID: {
      type: Schema.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      required: true,
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

tokenSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("ForgotToken", tokenSchema);
