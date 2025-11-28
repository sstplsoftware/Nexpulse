// C:\NexPulse\backend\src\routes\superadminRoutes.js

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";
import {
  getAdmins,
  createAdmin,
  updateAdmin,
  lockAdmin,
  extendAdmin,
  deleteAdmin,
} from "../controllers/superadminController.js";

const router = express.Router();

// Protect everything with SUPER_ADMIN permission
router.use(authMiddleware, roleMiddleware("SUPER_ADMIN"));

router.get("/admins", getAdmins);
router.post("/admins", createAdmin);
router.put("/admins/:id", updateAdmin);
router.patch("/admins/:id/lock", lockAdmin);
router.patch("/admins/:id/extend", extendAdmin);
router.delete("/admins/:id", deleteAdmin);

export default router;
