import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  canManageSalary,
  canMarkSalaryPaid,
} from "../middleware/salaryPermission.js";

import {
  getMySalary,
  getSalaryHistory,
  getAdminSalaries,
  createOrUpdateSalary,
  deleteSalary,
  markSalaryPaid,
} from "../controllers/salaryController.js";

const router = express.Router();

router.use(authMiddleware);

// ================= EMPLOYEE =================
router.get("/my", getMySalary);
router.get("/my/history", getSalaryHistory);

// ================= VIEW =================
router.get("/admin", canManageSalary, getAdminSalaries);

// ================= CREATE / UPDATE =================
router.post("/manage", canManageSalary, createOrUpdateSalary);

// ================= DELETE =================
router.delete("/:id", canManageSalary, deleteSalary);

// ================= MARK PAID =================
router.patch("/:id/pay", canMarkSalaryPaid, markSalaryPaid);

export default router;
