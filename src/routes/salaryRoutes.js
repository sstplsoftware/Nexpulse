import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

import {
  getMySalary,
  getSalaryHistory,
  getAdminSalaries,
  createOrUpdateSalary,
  deleteSalary,
} from "../controllers/salaryController.js";

const router = express.Router();
router.use(authMiddleware);

// EMPLOYEE
router.get("/my", getMySalary);
router.get("/my/history", getSalaryHistory);

// ADMIN
router.get("/admin", getAdminSalaries);
router.post("/manage", createOrUpdateSalary);
router.delete("/:id", deleteSalary);

export default router;
