import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandles.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    // Access token give user but refrwsh token we save in database because not ask for passwaord everytime

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating token and access",
    );
  }
};
const registerUser = asyncHandler(async (req, res) => {
  const { email, userName, fullName, password } = req.body;
  // check if filed are empty
  // implement middleware for before registerion upload img and avatar in user.route.js

  if (
    [email, userName, fullName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fileds are required ");
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

const loginUser = asyncHandler(async (req, res) => {
  // req body get data
  //user name and email
  // find user
  // if user find password check
  // access and refresh token generate
  // send on cookies sequre cookies

  // Get data form login screen
  const { email, userName, password } = req.body;

  if (!email || !userName) {
    throw new ApiError(400, "username or email required");
  }

  const user = await User.findOne({
    $or: [{ userName, email }],
  });

  if (!user) {
    throw new ApiError(404, "user does not exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(404, "Invalid user cred..");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );
  //  default cookies can manage frontend but when we httpOnly true , then only allow backend
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "user loggedIN sucessfully ",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // req.user._id comes from the authenticated JWT payload, decoded and attached by verifyJWT middleware.

  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      refreshToken: undefined,
    },
  });
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "user logout "));
});

const refreshToken = asyncHandler(async (req, res) => {
  // step -1 : access from cookies
  const incomingRefrshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefrshToken) {
    throw new ApiError(401, "unauthorized request ");
  }

  try {
    // setp-2  verify with jwt
    const decodedToken = jwt.verify(
      incomingRefrshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    // step-3 get user

    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(401, "invalid refresh token");
    }
    // step 4 match token incoming token and user token

    if (incomingRefrshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token is expired or used ");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "access token refreshed",
        ),
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "invalid old password");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "password is changes"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetch sucessfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "all fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true, runValidators: true },
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "user profile successfully updated"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar ufile is missing");
  }

  const newAvatarPath = await uploadOnCloudinary(avatarLocalPath);
  if (!newAvatarPath) {
    throw new ApiError(400, "error while uploading on avatar ");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: newAvatarPath.url,
      },
    },
    { new: true },
  ).select("-password");

  // Delete avatar after upload from local
  // Delete avatar after upload from local

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar successfully updated"));
});

const updateCoverImg = asyncHandler(async (req, res) => {
  const coverImgLocalPath = req.file?.path;
  if (!coverImgLocalPath) {
    throw new ApiError(400, "cover Img  is missing");
  }

  const newCoverImgPath = await uploadOnCloudinary(coverImgLocalPath);
  if (!newCoverImgPath) {
    throw new ApiError(400, "error while uploading on cover Img ");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: newCoverImgPath.url,
      },
    },
    { new: true },
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "cover image successfully updated"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  // const username = req.params.username; // by params
  const username = req.query.userName; // by query
  if (!username?.trim()) {
    throw new ApiError(400, "user name is missing");
  }

  const userName = username.toLowerCase();

  const channel = await User.aggregate([
    {
      $match: {
        userName,
      },
    },
    {
      $lookup: {
        from: "subscription",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscription",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelssubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribedTo"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        userName: 1,
        subscribersCount: 1,
        channelssubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists ");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "user channel fetch sucessfully "));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "video",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    userName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0]?.watchHistory || [],
        "watch history fetch successfully",
      ),
    );
});
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  changePassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImg,
  getUserChannelProfile,
  getWatchHistory,
};
