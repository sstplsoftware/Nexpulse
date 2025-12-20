// C:\NexPulse\backend\src\routes\salaryRoutes.js

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

// 🔐 AUTH REQUIRED
router.use(authMiddleware);

/* ================= EMPLOYEE ================= */

// Current month salary
router.get("/my", getMySalary);

// Last 6 months salary history
router.get("/my/history", getSalaryHistory);

/* ================= ADMIN ================= */

// View salaries
router.get("/admin", canManageSalary, getAdminSalaries);

// Create / Update salary
router.post("/manage", canManageSalary, createOrUpdateSalary);

// Delete salary
router.delete("/:id", canManageSalary, deleteSalary);

// Mark PAID (ADMIN ONLY)
router.patch("/:id/pay", canMarkSalaryPaid, markSalaryPaid);

export default router;
