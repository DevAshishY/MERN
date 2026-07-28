import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandles.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  const { email, userName, fullName, password } = req.body;
  // check if filed are empty
  // implement middleware for before registerion upload img and avatar in user.route.js

  if (
    [email, userName, fullName, password].some((field) => field?.trim() === "")
  ) {
    return ApiError(400, "All fileds are required ");
  }

  // check if user exist

  const existedUser = await User.findOne({
    $or: [
      {
        userName,
      },
      { email },
    ],
  });

  if (existedUser) {
    throw new ApiError(409, "user with username or email alreday exist");
  }

  // check for images and avatar
  const avalarLocalPath = req.files?.avatar?.[0]?.path;
  const coverLocalPath = req.files?.coverImage?.[0]?.path;
  if (!avalarLocalPath) {
    throw new ApiError(400, "avatar file is required");
  }

  //  upload images on cloudary

  const avatar = await uploadOnCloudinary(avalarLocalPath);
  const coverImage = await uploadOnCloudinary(coverLocalPath);

  if (!avatar) {
    throw new ApiError(400, "avatar upload failed");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong when register user ");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user sucessfully created "));
});

export { registerUser };
