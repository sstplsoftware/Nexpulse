import multer from "multer";
import pkg from "multer-storage-cloudinary";   // <-- FIX
import cloudinary from "../config/cloudinary.js";

const { CloudinaryStorage } = pkg; // <-- Proper destructuring for CJS modules

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "nexpulse/hrm-docs",
    resource_type: "auto",
  },
});

export const hrmUpload = multer({ storage });
