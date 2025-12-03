import express from "express";
import {
  createHoliday,
  listHolidays,
} from "../controllers/holidayController.js";

const router = express.Router();

router.post("/create", createHoliday);
router.get("/list", listHolidays);

export default router;
