import Contact from "../models/contact.js";
import sendEmail from "../utils/sendEmail.js";

export const submitContactForm = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // 1️⃣ Save to MongoDB
    const newContact = new Contact({ name, email, message });
    await newContact.save();

    // 2️⃣ Email (fully isolated)
    try {
      await sendEmail({ name, email, message });
    } catch (emailError) {
      console.error("📧 Email failed:", emailError.message);
    }

    // 3️⃣ Respond SUCCESS no matter what
    return res.status(201).json({
      success: true,
      message: "Message sent successfully"
    });

  } catch (error) {
    console.error("❌ Contact error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
