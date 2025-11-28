import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";
import {
  getEmployeesByAdmin,
  updateEmployeePermissions,
} from "../controllers/adminEmployeeController.js";

const router = express.Router();

// ALL ADMIN ROUTES REQUIRE → ADMIN LOGIN
router.use(authMiddleware, roleMiddleware("ADMIN"));

// GET employees created by this admin
router.get("/employees", getEmployeesByAdmin);

// UPDATE employee permissions
router.put("/employees/:id/permissions", updateEmployeePermissions);

export default router;
