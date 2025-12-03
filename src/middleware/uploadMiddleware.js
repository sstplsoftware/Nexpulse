import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "nexpulse/hrm-docs",
    resource_type: "auto",
  },
});

export const hrmUpload = multer({ storage });
