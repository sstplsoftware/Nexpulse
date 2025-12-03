import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema({
  date: String,
  title: String,
  description: String,
});

export default mongoose.model("Holiday", holidaySchema);
