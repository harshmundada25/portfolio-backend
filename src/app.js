import express from "express";
import cors from "cors";

import contactRoutes from "./routes/contactRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();

// Middlewares
app.use(
  cors({
    origin: "*", // safe for now, we'll restrict after deployment
    methods: ["GET", "POST"]
  })
);
app.use(express.json());

// Routes
app.use("/api", contactRoutes);
app.use("/api/admin", adminRoutes);

// Health check route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running 🚀"
  });
});

export default app;
