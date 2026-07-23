import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    notificationStatus: {
      type: String,
      enum: ["pending", "queued", "sent", "failed"],
      default: "pending"
    },
    notificationSentAt: {
      type: Date,
      default: null
    },
    notificationError: {
      type: String,
      default: null
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    message: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Contact = mongoose.model("Contact", contactSchema);

export default Contact;
