import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async function (localFilePath) {
  try {
    if (!localFilePath) return null;
    const response = await  cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // if file upload on cloudnary then remove files 
    if (localFilePath && fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    // attempt to remove local file if present
    try {
      if (localFilePath && fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    } catch (e) {
      console.log("failed to remove local file:", e.message);
    }
    console.log("cloudinary upload error:", error && error.message ? error.message : error);
    return null;
  }
};

export default uploadOnCloudinary;
