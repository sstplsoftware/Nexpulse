import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

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

// EMPLOYEE
router.get("/my", getMySalary);
router.get("/my/history", getSalaryHistory);

// ADMIN
router.get("/admin", getAdminSalaries);
router.post("/manage", createOrUpdateSalary);
router.delete("/:id", deleteSalary);
router.patch("/salary/:id/pay", authMiddleware, markSalaryPaid);


export default router;
