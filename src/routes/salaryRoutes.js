import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  manageSalary,
  adminSalaries,
  mySalary,
} from "../controllers/salaryController.js";

const router = express.Router();

router.post("/manage", authMiddleware, manageSalary);
router.get("/admin/all", authMiddleware, adminSalaries);
router.get("/my", authMiddleware, mySalary);

export default router;
