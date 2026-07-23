import mongoose from "mongoose";
import Contact from "../models/contact.js";
import { queueContactNotification } from "../utils/sendEmail.js";

export const submitContactForm = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: "Database temporarily unavailable. Please try again shortly."
      });
    }

    // Save to MongoDB (CRITICAL)
    const newContact = new Contact({ name, email, message });
    await newContact.save();

    // Queue email notification with retry and duplicate protection.
    void queueContactNotification(newContact._id).catch((err) => {
      console.error("📧 Notification queue failed:", err.message);
    });

    // Respond immediately
    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      notificationStatus: "queued"
    });

  } catch (error) {
    console.error("❌ Contact error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
