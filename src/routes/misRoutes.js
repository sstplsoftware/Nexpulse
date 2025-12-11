// C:\NexPulse\backend\src\routes\misRoutes.js

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { misAccessGuard } from "../middleware/permissionMiddleware.js";
import { createMisRecord } from "../controllers/misCommonController.js";

const router = express.Router();

// Auth + MIS access (ADMIN or EMPLOYEE with MIS_MANAGE – see updated guard below)
router.use(authMiddleware, misAccessGuard);

// POST /api/mis/create
router.post("/create", createMisRecord);

export default router;
