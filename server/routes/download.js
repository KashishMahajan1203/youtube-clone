import express from "express";
import {
    handledownload,
    getalldownloads,
    deletedownload,
} from "../controllers/download.js";
import { requireAuth, requireSelf } from "../middleware/auth.js";

const router = express.Router();

router.post("/:videoId", requireAuth, handledownload);
router.get("/getall/:userId", requireAuth, requireSelf(), getalldownloads);
router.delete("/delete/:id", requireAuth, deletedownload);

export default router;
