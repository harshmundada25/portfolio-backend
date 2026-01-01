import express from "express";
import cors from "cors";

import contactRoutes from "./routes/contactRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();

// Middlewares
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://portfolio-five-lac-78.vercel.app/",
      "https://harshmundada-portfolio-git-main-harshmundada25.vercel.app"
    ],
    methods: ["GET", "POST"],
    credentials: false
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
