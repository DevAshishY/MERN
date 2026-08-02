import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandles.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

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
  console.log(req.body, "fgfgfg");
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
    throw new ApiError(404, "INvalid user cred..");
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

    const { accessToekn, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToekn", accessToekn, options)
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
export { registerUser, loginUser, logoutUser, refreshToken };
