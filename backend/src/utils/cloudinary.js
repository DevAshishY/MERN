import { v2 as cloudinary } from "cloudinary";
import { log } from "console";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async function (localFIlepAth) {
  try {
    if (!localPath) return null;
    //upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFIlepAth, {
      resource_type: "auto",
    });

    // file has been uploaded sucessfully
    console.log("file has been uploaded sucessfully", response.url);
    return response;
  } catch (error) {
    fs.unlinkSync(localFIlepAth);
    console.log(error);
  }
};

export default uploadOnCloudinary;
