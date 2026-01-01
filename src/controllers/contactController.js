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

    // Save to MongoDB
    const newContact = new Contact({ name, email, message });
    await newContact.save();

    // Send email WITHOUT blocking API response
    sendEmail({ name, email, message }).catch(err =>
      console.error("Email failed:", err.message)
    );

    res.status(201).json({
      success: true,
      message: "Message sent successfully"
    });
  } catch (error) {
    console.error("❌ Contact error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
