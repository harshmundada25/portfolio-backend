import express from "express";
import { getAllMessages } from "../controllers/adminController.js";

const router = express.Router();

router.get("/messages", getAllMessages);

export default router;
