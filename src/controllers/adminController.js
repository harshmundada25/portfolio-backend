import Contact from "../models/contact.js";

export const getAllMessages = async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    console.error("❌ Admin fetch error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
