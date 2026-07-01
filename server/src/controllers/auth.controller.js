import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import  User  from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import {ApiResponse} from '../utils/ApiResponse.js'
import mongoose from "mongoose";
import jwt from 'jsonwebtoken'
import bcrypt from "bcrypt"
import otpGenerator from 'otp-generator'
import accountApprovedTemplate from "../email/templates/accountApprovedTemplate.js";
import mailSender from "../utils/mailSender.js";
import OTP from "../models/OTP.model.js";
import Profile from "../models/profile.model.js";
import otpTemplate from "../email/templates/emailVerificationTemplate.js";
import passwordUpdated from "../email/templates/passwordUpdate.js";
// Citizen Signup
export const generateAccessAndRefreshToken= async(userId)=>{
    try {
        const user=await User.findById(userId);
        if(!user){
            throw new ApiError(404, "User not found");
        }
        const accessToken=user.generateAccessToken()
        // console.log("Generating access and refresh token for user:", user.email);
        const refreshToken=user.generateRefreshToken()
        user.refreshToken=refreshToken

        await user.save({ validateBeforeSave: false })

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
     
    }
}

const cookieOptions = {
    httpOnly: true,

    secure: process.env.NODE_ENV === "production",

    sameSite:
        process.env.NODE_ENV === "production"
            ? "none"
            : "lax",

    maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const sendOTP= asyncHandler(async (req, res) => {
    try {
        const {email}= req.body;
        console.log("Email received for OTP:", req.body );
        
        if (!email) {
            throw new ApiError(400, "Email is required");
        }
        
        console.log("Sending OTP to user:", email);
        const checkUserPresent= await User.findOne({ email: email.toLowerCase() });
        if (checkUserPresent) {
            throw new ApiError(400, "User already exists with this email");
        }   
        
        const otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            specialChars: false,
            lowerCaseAlphabets: false,
            digits: true
        });

        const name = email.split('@')[0].split('.').map(part => part.replace(/\d+/g, '')).join(' ');
        console.log("Generated name:", name);
        
        // Create OTP record first (this will trigger email sending via pre-save hook)
        const otpData = await OTP.create({
            email: email.toLowerCase(),
            otp: otp
        });
        
        if(!otpData) {
            throw new ApiError(500, "Something went wrong while saving OTP");
        }
        
        return res.status(200).json(
            new ApiResponse(200, "OTP sent successfully", {
                email: email.toLowerCase(),
                otpId: otpData._id
            })
        );
    } catch (error) {
        console.error("SendOTP Error:", error);
        throw new ApiError(500, error.message || "Something went wrong while sending OTP");
    }
})

export const createSuperAdmin = asyncHandler(async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword, contactNumber } = req.body;
        
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            throw new ApiError(400, "All fields are required");
        }
        if (password !== confirmPassword) {
            throw new ApiError(400, "Passwords do not match");
        }
        
        // Check if any admin already exists
        const existingAdmin = await User.findOne({ accountType: "SuperAdmin" });
        if (existingAdmin) {
            throw new ApiError(403, "Super Admin already exists. Use regular signup for additional admins.");
        }
        
        const checkUserAlreadyExists = await User.findOne({ email: email.toLowerCase() });
        if (checkUserAlreadyExists) {
            throw new ApiError(400, "User already exists with this email");
        }
        
        const profileDetails = await Profile.create({
            gender: null,
            dateOfBirth: null,
            about: null,
            contactNumber: contactNumber,
        });
        
        const user = await User.create({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password,
            contactNumber,
            accountType: "SuperAdmin",
            additionalDetails: profileDetails._id,
            approved: true, // Super admin is auto-approved
        });

        const createdUser = await User.findById(user._id).select("-password -refreshToken");
        
        return res.status(201).json(
            new ApiResponse(200, createdUser, "Super Admin created successfully!")
        );
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while creating super admin");
    }
});

export const Signup = asyncHandler(async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword, accountType, contactNumber, otp, department } = req.body;

        // Check required fields
        if (!firstName || !lastName || !email || !password || !confirmPassword || !accountType || !otp) {
            throw new ApiError(400, "All fields are required");
        }

        // Password confirmation
        if (password !== confirmPassword) {
            throw new ApiError(400, "Passwords do not match");
        }

        // Check if user already exists
        const checkUserAlreadyExists = await User.findOne({ email: email.toLowerCase() });
        if (checkUserAlreadyExists) {
            throw new ApiError(400, "User already exists with this email");
        }

        // ✅ Phone number validation
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(contactNumber)) {
            throw new ApiError(400, "Contact number must be a valid 10-digit number");
        }

        // Find most recent OTP
        const recentOtp = await OTP.findOne({ email: email.toLowerCase() }).sort({ createdAt: -1 });
        if (!recentOtp) {
            throw new ApiError(400, "OTP not found or expired");
        }

        // OTP match check
        if (recentOtp.otp !== otp) {
            throw new ApiError(400, "Invalid OTP");
        }

        // Create Profile
        const profileDetails = await Profile.create({
            gender: null,
            dateOfBirth: null,
            about: null,
            contactNumber: contactNumber,
        });

        if (!profileDetails) {
            throw new ApiError(500, "Something went wrong while creating profile details");
        }

        // Account approval logic
        let approved = true;
        if (accountType === "Staff" || accountType === "Admin") {
            approved = false; // requires Admin approval
            if (!department) {
                throw new ApiError(400, "Department is required for Staff and Admin accounts");
            }
        }

        // Image upload (if provided)
        let image = null;
        if (req.file) {
            image = await uploadOnCloudinary(req.file.path, "users");
            if (!image) {
                throw new ApiError(500, "Something went wrong while uploading image");
            }
        }

        // Create new user
        const user = await User.create({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password,
            contactNumber,
            accountType,
            department,
            additionalDetails: profileDetails._id,
            approved,
            image: image ? image.url : undefined,
        });

        // Fetch created user without sensitive fields
        const createdUser = await User.findById(user._id).select("-password -refreshToken");
        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering the user");
        }

        return res.status(201).json(
            new ApiResponse(200, createdUser, "User registered successfully!")
        );

    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while signing up");
    }
});

// Citizen Login
export const loginCitizen = asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new ApiError(400, "Email and password are required");
        }
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        const isPasswordCorrect = await user.isPasswordCorrect(password);
        if (!isPasswordCorrect) {
            throw new ApiError(401, "Invalid credentials");
        }
        if(user.accountType !== "Citizen"){
            throw new ApiError(403, "You are not authorized to login as Citizen");
        }
        if(!user.approved){
            throw new ApiError(403, "Your account is not approved yet. Please contact admin.");
        }
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
        // Fetch user details excluding sensitive fields
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
        if (!loggedInUser) {
            throw new ApiError(500, "Something went wrong while fetching user details");
        }

        // // Set cookie options
        // const options = {
        //     httpOnly: true,
        //     secure: process.env.NODE_ENV === "production",
        //     sameSite: "strict",
        //     maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        // };

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json(
            new ApiResponse(
                200,
                {
                user: loggedInUser,
                accessToken,
                refreshToken
                },
                "Citizen logged in Successfully"
            )
            );
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while citizen logging in");
    }
});
// Admin Login
export const loginAdmin =  asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new ApiError(400, "Email and password are required");
        }
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            throw new ApiError(404, "admin not found");
        }
        const isPasswordCorrect = await user.isPasswordCorrect(password);
        if (!isPasswordCorrect) {
            throw new ApiError(401, "Invalid credentials");
        }
        if(user.accountType !== "Admin"){
            throw new ApiError(403, "You are not authorized to login as Admin");
        }
        if(!user.approved){
            throw new ApiError(403, "Your account is not approved yet. Please contact super admin.");
        }
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
        // Fetch user details excluding sensitive fields
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
        if (!loggedInUser) {
            throw new ApiError(500, "Something went wrong while fetching user details");
        }

        // Set cookie options
        // const options = {
        //     httpOnly: true,
        //     secure: process.env.NODE_ENV === "production",
        //     sameSite: "strict",
        //     maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        // };

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json(
            new ApiResponse(
                200,
                {
                user: loggedInUser,
                accessToken,
                refreshToken
                },
                "Admin logged in Successfully"
            )
            );
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while admin logging in");
    }
});

// Staff Login
export const loginStaff =  asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new ApiError(400, "Email and password are required");
        }
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        const isPasswordCorrect = await user.isPasswordCorrect(password);
        if (!isPasswordCorrect) {
            throw new ApiError(401, "Invalid credentials");
        }
        if(user.accountType !== "Staff"){
            throw new ApiError(403, "You are not authorized to login as Staff");
        }
        if(!user.approved){
            throw new ApiError(403, "Your account is not approved yet. Please contact admin.");
        }
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
        // Fetch user details excluding sensitive fields
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
        if (!loggedInUser) {
            throw new ApiError(500, "Something went wrong while fetching user details");
        }

        // Set cookie options
        // const options = {
        //     httpOnly: true,
        //     secure: process.env.NODE_ENV === "production",
        //     sameSite: "strict",
        //     maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        // };

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json(
            new ApiResponse(
                200,
                {
                user: loggedInUser,
                accessToken,
                refreshToken
                },
                "Staff logged in Successfully"
            )
            );
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while Staff logging in");
    }
});

// SuperAdmin Login
export const loginSuperAdmin = asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new ApiError(400, "Email and password are required");
        }
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            throw new ApiError(404, "SuperAdmin not found");
        }
        const isPasswordCorrect = await user.isPasswordCorrect(password);
        if (!isPasswordCorrect) {
            throw new ApiError(401, "Invalid credentials");
        }
        if(user.accountType !== "SuperAdmin"){
            throw new ApiError(403, "You are not authorized to login as SuperAdmin");
        }
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
        if (!loggedInUser) {
            throw new ApiError(500, "Something went wrong while fetching user details");
        }

        // const options = {
        //     httpOnly: true,
        //     secure: process.env.NODE_ENV === "production",
        //     sameSite: "strict",
        //     maxAge: 7 * 24 * 60 * 60 * 1000
        // };

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json(
            new ApiResponse(
                200,
                {
                user: loggedInUser,
                accessToken,
                refreshToken
                },
                "SuperAdmin logged in Successfully"
            )
            );
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while SuperAdmin logging in");
    }
});

// Admin Signup (SuperAdmin creates Admin)
export const adminSignup = asyncHandler(async (req, res) => {
    try {
        const { firstName, lastName, email, password, department } = req.body;
        const superAdminId = req.user;
        
        if (!firstName || !lastName || !email || !password || !department) {
            throw new ApiError(400, "All fields are required");
        }
        
        const superAdmin = await User.findById(superAdminId._id);
        if (!superAdmin || superAdmin.accountType !== "SuperAdmin" || !superAdmin.approved) {
            throw new ApiError(403, "You are not authorized to create admin accounts");
        }
        
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            throw new ApiError(400, "User already exists with this email");
        }
        
        const profileDetails = await Profile.create({
            gender: null,
            dateOfBirth: null,
            about: null,
            contactNumber: null,
        });
        
        const admin = await User.create({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password,
            accountType: "Admin",
            department,
            additionalDetails: profileDetails._id,
            approved: true,
        });
        
        const createdAdmin = await User.findById(admin._id).select("-password -refreshToken");
        
        return res.status(201).json(
            new ApiResponse(200, createdAdmin, "Admin account created successfully!")
        );
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while creating admin account");
    }
});

export const logout = asyncHandler(async (req, res) => {
    try {
        const userId = req.user;
        if (!userId) {
            throw new ApiError(400, "User not found");
        }
        const user = await User.findById(userId._id);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        user.refreshToken = null;
        await user.save({ validateBeforeSave: false });
        
        return res
            .status(200)
            .clearCookie("accessToken", cookieOptions)
            .clearCookie("refreshToken", cookieOptions)
            .json(new ApiResponse(200, null, "User logged out successfully"));
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while logging out");
    }
});

export const approveAccount = asyncHandler(async (req, res) => {
    try {
        const adminId=req.user;
        const {email}=req.body;
        if(!adminId){
            throw new ApiError(400,"Admin not found");
        }
        if(!email){
            throw new ApiError(400,"Email is required to approve account");
        }
        const admin=await User.findById(adminId._id);
        if(!admin || admin.accountType !== "Admin" || !admin.approved){
            throw new ApiError(403,"You are not authorized to approve accounts");
        }
        const _user=await User.findOne({email:email.toLowerCase()});
        if(!_user){
            throw new ApiError(404,"User not found");
        }
        if(_user.approved || _user.accountType === "Citizen"){
            throw new ApiError(400,"USer account is already approved");
        }
        _user.approved=true;
        const appro=await _user.save({validateBeforeSave:false});
        if(!appro){
            throw new ApiError(500,"somthing wnetys wrong while appriovin the account");
        }
        const new_user=await User.findById(_user._id).select("-password -refreshToken");
        if(!new_user){
            throw new ApiError(500,"Internal ServerError while appoving account");
        }
        if(!new_user.approved){
            throw new ApiError(500,"Internal ServerError while appoving account");
        }
        if(new_user.approved){
            await mailSender(new_user.email,"Account Approved", accountApprovedTemplate(new_user.firstName, new_user.email));
        }
        return res.status(200).json(new ApiResponse(200,new_user,"Account approved successfully"));

    } catch (error) {
        throw new ApiError(500,"Internal ServerError while appoving account");
    }
});

export const approveAdminAccount = asyncHandler(async (req, res) => {
    try {
        const adminId=req.user;
        const {email}=req.body;
        if(!adminId){
            throw new ApiError(400,"Admin not found");
        }
        if(!email){
            throw new ApiError(400,"Email is required to approve account");
        }
        const superadmin=await User.findById(adminId._id);
        if(!superadmin || superadmin.accountType !== "SuperAdmin" || !superadmin.approved){
            throw new ApiError(403,"You are not authorized to approve accounts");
        }
        const _user=await User.findOne({email:email.toLowerCase()});
        if(!_user){
            throw new ApiError(404,"User not found");
        }
        if(_user.approved || _user.accountType === "Citizen" || _user.accountType === "Staff"){
            throw new ApiError(400,"USer account is already approved");
        }
        _user.approved=true;
        const appro=await _user.save({validateBeforeSave:false});
        if(!appro){
            throw new ApiError(500,"somthing wnetys wrong while appriovin the account");
        }
        const new_user=await User.findById(_user._id).select("-password -refreshToken");
        if(!new_user){
            throw new ApiError(500,"Internal ServerError while appoving account");
        }
        if(!new_user.approved){
            throw new ApiError(500,"Internal ServerError while appoving account");
        }
        if(new_user.approved){
            await mailSender(new_user.email,"Account Approved", accountApprovedTemplate(new_user.firstName, new_user.email));
        }
        return res.status(200).json(new ApiResponse(200,new_user,"Account approved successfully"));

    } catch (error) {
        throw new ApiError(500,"Internal erver error while approving the admin account");
    }
});

export const fetchUnapprovedAdmin = asyncHandler(async (req, res) => {
    try {
        const superadminId=req.user;
       if(!superadminId){
           throw new ApiError(400,"SuperAdmin not found");
       }
       const unapprovedAdmins = await User.find({ accountType: "Admin", approved: false });
       if(!unapprovedAdmins){
           throw new ApiError(404,"No unapproved admin accounts found");
       }
       return res.status(200).json(new ApiResponse(200, unapprovedAdmins, "Unapproved admin accounts fetched successfully"));

    } catch (error) {
        throw new ApiError(500,"Internal server error while fetching unapproved admin accounts");
    }
});
export const fetchUnapprovedStaff = asyncHandler(async (req, res) => {
try {
    const adminId=req.user;
    if(!adminId){
        throw new ApiError(400,"Admin not found");
    }
    const admin=await User.findById(adminId._id);
    if(!admin || admin.accountType !== "Admin" || !admin.approved){
        throw new ApiError(403,"You are not authorized to view unapproved staff accounts");
    }
    // Filter by admin's department and populate contact details
    const unapprovedStaff = await User.find({ 
        accountType: "Staff", 
        approved: false, 
        department: admin.department 
    }).populate('additionalDetails');
    if(!unapprovedStaff){
        throw new ApiError(404,"No unapproved staff accounts found");
    }
    return res.status(200).json(new ApiResponse(200, unapprovedStaff, "Unapproved staff accounts fetched successfully"));
} catch (error) {
    throw new ApiError(500,"Internal server error while fetching unapproved staff accounts");
}
});

export const getAccountByQuery= asyncHandler(async (req, res) => {
    try {
        const credentials = req.body;
        const admin= req.user._id ? await User.findById(req.user._id) : null;
        if(!admin || (admin.accountType !== "Admin" && admin.accountType!== "SuperAdmin") || !admin.approved){
            throw new ApiError(403,"You are not authorized to view user accounts");
        }
        if(Object.keys(credentials).length === 0){
            throw new ApiError(400, "At least one query parameter is required");
        }
        const user = await User.findOne(credentials).select("-password -refreshToken");
        if(!user){
            throw new ApiError(404, "User not found");
        }
        return res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while fetching user by query");
    }
});

// Reject Staff account (delete from DB)
export const rejectStaffApproval = asyncHandler(async (req, res) => {
    const adminId = req.user;
    const { email } = req.body;

    if (!adminId) throw new ApiError(400, "Admin not found");
    if (!email) throw new ApiError(400, "Email is required");

    const admin = await User.findById(adminId._id);
    if (!admin || admin.accountType !== "Admin" || !admin.approved) {
        throw new ApiError(403, "You are not authorized to reject accounts");
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new ApiError(404, "User not found");
    if (user.accountType !== "Staff") throw new ApiError(400, "User is not a staff account");

    await User.deleteOne({ _id: user._id });

    // Simple email
    await mailSender(user.email, "Account Rejected", `
        <p>Hi ${user.firstName},</p>
        <p>Your staff account has been rejected by the admin.</p>
        <p>If you think this is a mistake, please contact support.</p>
    `);

    return res.status(200).json(new ApiResponse(200, null, "Staff account rejected and deleted successfully"));
});

// Reject Admin account (delete from DB)
export const rejectAdminApproval = asyncHandler(async (req, res) => {
    const superadminId = req.user;
    const { email } = req.body;

    if (!superadminId) throw new ApiError(400, "SuperAdmin not found");
    if (!email) throw new ApiError(400, "Email is required");

    const superadmin = await User.findById(superadminId._id);
    if (!superadmin || superadmin.accountType !== "SuperAdmin" || !superadmin.approved) {
        throw new ApiError(403, "You are not authorized to reject accounts");
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new ApiError(404, "User not found");
    if (user.accountType !== "Admin") throw new ApiError(400, "User is not an admin account");

    await User.deleteOne({ _id: user._id });

    // Simple email
    await mailSender(user.email, "Account Rejected", `
        <p>Hi ${user.firstName},</p>
        <p>Your admin account has been rejected by the superadmin.</p>
        <p>If you think this is a mistake, please contact support.</p>
    `);

    return res.status(200).json(new ApiResponse(200, null, "Admin account rejected and deleted successfully"));
});

// Unapprove Staff account (approved = false)
export const unapproveStaffAccount = asyncHandler(async (req, res) => {
    const adminId = req.user;
    const { email } = req.body;

    if (!adminId) throw new ApiError(400, "Admin not found");
    if (!email) throw new ApiError(400, "Email is required");

    const admin = await User.findById(adminId._id);
    if (!admin || admin.accountType !== "Admin" || !admin.approved) {
        throw new ApiError(403, "You are not authorized to unapprove accounts");
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new ApiError(404, "User not found");
    if (user.accountType !== "Staff") throw new ApiError(400, "User is not a staff account");

    user.approved = false;
    await user.save({ validateBeforeSave: false });

    // Simple email
    await mailSender(user.email, "Account Unapproved", `
        <p>Hi ${user.firstName},</p>
        <p>Your staff account has been unapproved by the admin.</p>
        <p>Please contact admin for further actions.</p>
    `);

    return res.status(200).json(new ApiResponse(200, null, "Staff account unapproved successfully"));
});

// Unapprove Admin account (approved = false)
export const unapproveAdminAccount = asyncHandler(async (req, res) => {
    const superadminId = req.user;
    const { email } = req.body;

    if (!superadminId) throw new ApiError(400, "SuperAdmin not found");
    if (!email) throw new ApiError(400, "Email is required");

    const superadmin = await User.findById(superadminId._id);
    if (!superadmin || superadmin.accountType !== "SuperAdmin" || !superadmin.approved) {
        throw new ApiError(403, "You are not authorized to unapprove accounts");
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new ApiError(404, "User not found");
    if (user.accountType !== "Admin") throw new ApiError(400, "User is not an admin account");

    user.approved = false;
    await user.save({ validateBeforeSave: false });

    // Simple email
    await mailSender(user.email, "Account Unapproved", `
        <p>Hi ${user.firstName},</p>
        <p>Your admin account has been unapproved by the superadmin.</p>
        <p>Please contact superadmin for further actions.</p>
    `);

    return res.status(200).json(new ApiResponse(200, null, "Admin account unapproved successfully"));
});
