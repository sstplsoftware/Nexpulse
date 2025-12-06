// C:\NexPulse\backend\src\routes\adminMisRoutes.js

import express from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { misAccessGuard } from "../middleware/permissionMiddleware.js";
import {
  uploadMisExcelAdmin,
  createMisRecordAdmin,
  listMisRecordsAdmin,
  getMisRecordAdmin,
  updateMisRecordAdmin,
  deleteMisRecordAdmin,
  getMisRecordHistoryAdmin,
  exportAllMisAdmin,
} from "../controllers/misAdminController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Any user with MIS access (ADMIN or EMPLOYEE+MIS_MANAGE)
router.use(authMiddleware, misAccessGuard);

// Upload Excel (ADMIN will use this; EMPLOYEE has its own /employee/mis/upload)
router.post("/upload", upload.single("file"), uploadMisExcelAdmin);

// Manual add row
router.post("/records", createMisRecordAdmin);

// List with filters
router.get("/records", listMisRecordsAdmin);

// Single record
router.get("/records/:id", getMisRecordAdmin);

// Update
router.patch("/records/:id", updateMisRecordAdmin);

// Soft delete
router.delete("/records/:id", deleteMisRecordAdmin);

// History
router.get("/records/:id/history", getMisRecordHistoryAdmin);

// Export (filtered)
router.get("/export-all", exportAllMisAdmin);

export default router;
