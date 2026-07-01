// import express from 'express';
// import {asyncHandler} from '../utils/asyncHandler.js';
// import {ApiResponse} from '../utils/ApiResponse.js';
// import Complaint from '../models/complaint.model.js';
// import { ApiError } from '../utils/ApiError.js';
// import  User from '../models/user.model.js';
// import mailSender from "../utils/mailSender.js";
// import statusUpdateTemplate from '../email/templates/statusUpdateTemplate.js';
// import { uploadOnCloudinary } from '../utils/Cloudinary.js';

// const createComplaint= asyncHandler(async (req,res)=>{
//     const {department,location,description,latitude,longitude}= req.body;
//     const user = req.user._id ? await User.findById(req.user._id) : null;
//     const imageUrl = req.file ? req.file.path : null;
    
//     if(!imageUrl) throw new ApiError(400, "Image is required");
//     if(!user) throw new ApiError(404, "User not found");
//     if(!department || !location) throw new ApiError(400, "Department and location are required");
//     if (!description || description.length < 20) throw new ApiError(400, "Description must be at least 20 characters");
//     if(user.accountType !== 'Citizen') throw new ApiError(403, "Only citizens can create complaints");
    
//     const serviceImage = await uploadOnCloudinary(imageUrl);
//     if(!serviceImage) throw new ApiError(500, "Failed to upload image");
    
//     // Prepare complaint data with optional coordinates
//     const complaintData = {
//       userId: user._id,
//       department,
//       location,
//       imageUrl: serviceImage.secure_url,
//       description,
//     };
    
//     // Add coordinates only if provided (for backward compatibility)
//     if (latitude && longitude) {
//       complaintData.latitude = parseFloat(latitude);
//       complaintData.longitude = parseFloat(longitude);
//     }
    
//     const complaint = await Complaint.create(complaintData);

//     return res.status(200).json(new ApiResponse(200,complaint,"Complaint created successfully"));
// });

// const deleteComplaint= asyncHandler(async (req,res)=>{
//     try {
//         const {id}= req.params;
//         const user = req.user._id ? await User.findById(req.user._id) : null;
//         if(!user) throw new ApiError(404, "User not found"); 
//         if(user.accountType !== 'Citizen'){
//             throw new ApiError(403, "Only citizens can delete complaints");
//         }
//         const complaint = await Complaint.findById(id);
//         if(!complaint) throw new ApiError(404, "Complaint not found");
//         if(complaint.userId.toString() !== user._id.toString()){
//             throw new ApiError(403, "You are not authorized to delete this complaint");
//         }   
//         await complaint.remove();
//         return res.status(200).json(new ApiResponse(200,null,"Complaint deleted successfully"));
//     } catch (error) {
//         throw new ApiError(error?.code || 500, error?.message || "Something went wrong while deleting the complaint");
//     }
// });

// const changeProgressStatus = asyncHandler(async (req, res) => {
//   try {
//     const { id } = req.params; 
//     const { status } = req.body;

//     const user = req.user._id ? await User.findById(req.user._id) : null;
//     if (!user) throw new ApiError(404, "User not found"); 
//     if (user.accountType !== 'Staff') {
//       throw new ApiError(403, "Only staff can change the progress status of complaints");
//     }

//     const complaint = await Complaint.findById(id);
//     if (!complaint) throw new ApiError(404, "Complaint not found");

//     // ✅ Match the updated schema
//     if (!['open', 'in-progress', 'resolved', 'rejected'].includes(status)) {
//       throw new ApiError(400, "Invalid status");
//     }

//     // update status
//     complaint.status = status;

//     // ✅ handle resolved timestamp
//     if (status === 'resolved') {
//       complaint.resolvedAt = Date.now();
//     } else {
//       complaint.resolvedAt = null;
//     }

//     await complaint.save();

//     // send notification
//     const { email, firstName } = await User.findById(complaint.userId);
//     await mailSender(
//       email,
//       'Your Complaint Status Has Been Updated',
//       statusUpdateTemplate(firstName, complaint._id, complaint.status)
//     );

//     return res
//       .status(200)
//       .json(new ApiResponse(200, complaint, "Complaint status updated successfully"));

//   } catch (error) {
//     throw new ApiError(
//       error?.code || 500,
//       error?.message || "Something went wrong while changing the progress status of the complaint"
//     );
//   }
// });

// const getAllComplaints = asyncHandler(async (req, res) => {
//   try {
//     const user = req.user._id ? await User.findById(req.user._id) : null;

//         if(!user) throw new ApiError(404, "User not found"); 
//         let complaints;
//         if(user.accountType === 'Citizen'){
//             complaints = await Complaint.find({userId:user._id}).populate('userId','firstName lastName email');
//         }
//         else if(user.accountType === 'Staff'){
//             // Staff can only see complaints from their department
//             complaints = await Complaint.find({department: user.department}).populate('userId','firstName lastName email');
//         }
//         else if(user.accountType === 'Admin'){
//             // Admin can see all complaints
//             complaints = await Complaint.find().populate('userId','firstName lastName email');
//         }
//         else{
//             throw new ApiError(403, "Only citizens and staff can view complaints");
//         }
//         if(!complaints) throw new ApiError(404, "No complaints found");
//         return res.status(200).json(new ApiResponse(200,complaints,"Complaints fetched successfully"));
//     } catch (error) {
//         throw new ApiError(error?.code || 500, error?.message || "Something went wrong while fetching the complaints");
//     }
// });

// const getCitizenComplaints= asyncHandler(async (req,res)=>{
//     try {
//         const user = req.user._id ? await User.findById(req.user._id) : null;   
//         if(!user) throw new ApiError(404, "User not found");
//         if(user.accountType !== 'Citizen'){
//             throw new ApiError(403, "Only citizens can view their complaints");
//         }
//         const complaints = await Complaint.find({userId:user._id}).populate('userId','firstName lastName email');
//         if(!complaints) throw new ApiError(404, "No complaints found");
//         return res.status(200).json(new ApiResponse(200,complaints,"Complaints fetched successfully"));
//     } catch (error) {
//         throw new ApiError(error?.code || 500, error?.message || "Something went wrong while fetching the complaints");
//     }
// });

// const getComplaintById= asyncHandler(async (req,res)=>{
//     try {
//         const {id}= req.params; 
//         const complaint = await Complaint.findById(id).populate({path:'userId',select:'firstName lastName email '});
//         if(!complaint) throw new ApiError(404, "Complaint not found");
//         return res.status(200).json(new ApiResponse(200,complaint,"Complaint fetched successfully"));
//     } catch (error) {
//         throw new ApiError(error?.code || 500, error?.message || "Something went wrong while fetching the complaint");
//     }
// });

// const updateComplaint= asyncHandler(async (req,res)=>{
//     try {
//         const {id}= req.params;
//         const {department,location,description}= req.body;
//         const user = req.user._id ? await User.findById(req.user._id) : null;
//         if(!user) throw new ApiError(404, "User not found");
//         if(user.accountType !== 'Staff'){
//             throw new ApiError(403, "Only staff can update complaints");
//         }
//         const complaint = await Complaint.findById(id);
//         if(!complaint) throw new ApiError(404, "Complaint not found");
//         const newComplaint = await Complaint.findByIdAndUpdate(id,{
//             department: department || complaint.department,
//             location: location || complaint.location,
//             description: description || complaint.description,
//             updatedAt: Date.now(),
//         },{new:true});
//         return res.status(200).json(new ApiResponse(200,newComplaint,"Complaint updated successfully"));
//     } catch (error) {
//         throw new ApiError(error?.code || 500, error?.message || "Something went wrong while updating the complaint");
//     }
// });

// const getComplaintsByDepartment= asyncHandler(async (req,res)=>{
//     try {
//         const {department}= req.body;
//         const user = req.user._id ? await User.findById(req.user._id) : null;
//         if(!user) throw new ApiError(404, "User not found");
//         if(user.accountType !== 'Staff'){
//             throw new ApiError(403, "Only staff can view complaints by department");
//         }
//         const complaints=await Complaint.find({department}).populate( {path: 'userId', select:'firstName lastName email'});
//         if(!complaints) throw new ApiError(404, "No complaints found for this department");
//         return res.status(200).json(new ApiResponse(200,complaints,"Complaints fetched successfully by department"));
//     } catch (error) {
//         throw new ApiError(500,"something went wrong while fetching complaints by department")
//     }
// });

// const getComplaintsByStatus= asyncHandler(async(req,res)=>{
//     try {
//         const user=req.user._id ? await User.findById(req.user._id) : null;
//         if(!user) throw new ApiError(404,"User not found");
//         const {status}= req.body;
//         const complaints= await Complaint.find({status}).populate({path:'userId',select:'firstName lastName email'});
//         if(!complaints) throw new ApiError(404,"No complaints found for this status");
//         return res.status(200).json(new ApiResponse(200,complaints,"Complaints fetched successfully by status"));
//     } catch (error) {
//         throw new ApiError(500,"something wents wrong while fetching complaints by status");
//     }
// });

// const getComplaintsByfilter=asyncHandler(async(req,res)=>{
//     try {
//         const user=req.user._id ? await User.findById(req.user._id) : null;
//         if(!user) throw new ApiError(404,"User not found");
//         const credentails=req.body;
//         const complaints= await Complaint.find(credentails).populate({path:'userId',select:'firstName lastName email'});
//         if(!complaints) throw new ApiError(404,"No complaints found for this filter");
//         return res.status(200).json(new ApiResponse(200,complaints,"Complaints fetched successfully by filter"));
//     } catch (error) {
//         throw new ApiError(500,"somethind wents wrong while fetching complaints by filter")
//     }
// });


// export const getresolvedComplaints = asyncHandler(async (req, res) => {
//   try {
//     // check user
//     const user = req.user._id ? await User.findById(req.user._id) : null;
//     if (!user) throw new ApiError(404, "User not found");

//     if (user.accountType !== 'Staff' && user.accountType !== 'Admin') {
//       throw new ApiError(403, "Only staff can view resolved complaints");
//     }

//     // get resolved complaints
//     let complaintsQuery = { status: 'resolved' };
    
//     // Staff can only see resolved complaints from their department
//     if (user.accountType === 'Staff') {
//       complaintsQuery.department = user.department;
//     }
    
//     const complaints = await Complaint.find(complaintsQuery)
//       .populate({ path: 'userId', select: 'firstName lastName email' });

//     if (!complaints || complaints.length === 0)
//       throw new ApiError(404, "No resolved complaints found");

//     // attach time taken inside complaint object
//     const complaintsWithTime = complaints.map(c => {
//       const complaintObj = c.toObject(); // convert Mongoose doc to plain object
//       if (complaintObj.resolvedAt && complaintObj.createdAt) {
//         const diffMs = complaintObj.resolvedAt - complaintObj.createdAt;
//         // convert to hours (or days)
//         complaintObj.timeTakenToResolveHours = Math.round(diffMs / (1000 * 60 * 60));
//       } else {
//         complaintObj.timeTakenToResolveHours = null;
//       }
//       return complaintObj;
//     });

//     return res
//       .status(200)
//       .json(new ApiResponse(200, complaintsWithTime, "Resolved complaints fetched successfully"));
//   } catch (error) {
//     throw new ApiError(500, "Something went wrong while fetching resolved complaints");
//   }
// });


// export {createComplaint,
//         getAllComplaints,
//         deleteComplaint,
//         changeProgressStatus,
//         getCitizenComplaints,
//         getComplaintById,
//         updateComplaint,
//         getComplaintsByDepartment,
//         getComplaintsByStatus,
//         getComplaintsByfilter
//         };

import express from 'express';
import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import Complaint from '../models/complaint.model.js';
import { ApiError } from '../utils/ApiError.js';
import  User from '../models/user.model.js';
import mailSender from "../utils/mailSender.js";
import statusUpdateTemplate from '../email/templates/statusUpdateTemplate.js';
import { uploadOnCloudinary } from '../utils/Cloudinary.js';

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'];
const VALID_PREDICTION_METHODS = ['ml_model', 'keyword_fallback'];

const createComplaint= asyncHandler(async (req,res)=>{
    const {
      department,location,description,latitude,longitude,
      predictedHazardType,predictedSeverity,predictionConfidence,predictionMethod
    }= req.body;
    const user = req.user._id ? await User.findById(req.user._id) : null;
    const imageUrl = req.file ? req.file.path : null;
    
    if(!imageUrl) throw new ApiError(400, "Image is required");
    if(!user) throw new ApiError(404, "User not found");
    if(!department || !location) throw new ApiError(400, "Department and location are required");
    if (!description || description.length < 20) throw new ApiError(400, "Description must be at least 20 characters");
    if(user.accountType !== 'Citizen') throw new ApiError(403, "Only citizens can create complaints");
    
    const serviceImage = await uploadOnCloudinary(imageUrl);
    if(!serviceImage) throw new ApiError(500, "Failed to upload image");
    
    // Prepare complaint data with optional coordinates
    const complaintData = {
      userId: user._id,
      department,
      location,
      imageUrl: serviceImage.secure_url,
      description,
    };
    
    // Add coordinates only if provided (for backward compatibility)
    if (latitude && longitude) {
      complaintData.latitude = parseFloat(latitude);
      complaintData.longitude = parseFloat(longitude);
    }

    // Attach ML prediction metadata if it was sent and looks valid.
    // This is purely informational — never blocks complaint creation if missing/malformed.
    if (predictedHazardType) {
      complaintData.predictedHazardType = predictedHazardType;
    }
    if (predictedSeverity && VALID_SEVERITIES.includes(predictedSeverity)) {
      complaintData.predictedSeverity = predictedSeverity;
    }
    if (predictionConfidence !== undefined && !isNaN(parseFloat(predictionConfidence))) {
      complaintData.predictionConfidence = parseFloat(predictionConfidence);
    }
    if (predictionMethod && VALID_PREDICTION_METHODS.includes(predictionMethod)) {
      complaintData.predictionMethod = predictionMethod;
    }
    
    const complaint = await Complaint.create(complaintData);

    return res.status(200).json(new ApiResponse(200,complaint,"Complaint created successfully"));
});

const deleteComplaint= asyncHandler(async (req,res)=>{
    try {
        const {id}= req.params;
        const user = req.user._id ? await User.findById(req.user._id) : null;
        if(!user) throw new ApiError(404, "User not found"); 
        if(user.accountType !== 'Citizen'){
            throw new ApiError(403, "Only citizens can delete complaints");
        }
        const complaint = await Complaint.findById(id);
        if(!complaint) throw new ApiError(404, "Complaint not found");
        if(complaint.userId.toString() !== user._id.toString()){
            throw new ApiError(403, "You are not authorized to delete this complaint");
        }   
        await complaint.remove();
        return res.status(200).json(new ApiResponse(200,null,"Complaint deleted successfully"));
    } catch (error) {
        throw new ApiError(error?.code || 500, error?.message || "Something went wrong while deleting the complaint");
    }
});

const changeProgressStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params; 
    const { status } = req.body;

    const user = req.user._id ? await User.findById(req.user._id) : null;
    if (!user) throw new ApiError(404, "User not found"); 
    if (user.accountType !== 'Staff') {
      throw new ApiError(403, "Only staff can change the progress status of complaints");
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) throw new ApiError(404, "Complaint not found");

    // ✅ Match the updated schema
    if (!['open', 'in-progress', 'resolved', 'rejected'].includes(status)) {
      throw new ApiError(400, "Invalid status");
    }

    // update status
    complaint.status = status;

    // ✅ handle resolved timestamp
    if (status === 'resolved') {
      complaint.resolvedAt = Date.now();
    } else {
      complaint.resolvedAt = null;
    }

    await complaint.save();

    // send notification
    const { email, firstName } = await User.findById(complaint.userId);
    await mailSender(
      email,
      'Your Complaint Status Has Been Updated',
      statusUpdateTemplate(firstName, complaint._id, complaint.status)
    );

    return res
      .status(200)
      .json(new ApiResponse(200, complaint, "Complaint status updated successfully"));

  } catch (error) {
    throw new ApiError(
      error?.code || 500,
      error?.message || "Something went wrong while changing the progress status of the complaint"
    );
  }
});

const getAllComplaints = asyncHandler(async (req, res) => {
  try {
    const user = req.user._id ? await User.findById(req.user._id) : null;

        if(!user) throw new ApiError(404, "User not found"); 
        let complaints;
        if(user.accountType === 'Citizen'){
            complaints = await Complaint.find({userId:user._id}).populate('userId','firstName lastName email');
        }
        else if(user.accountType === 'Staff'){
            // Staff can only see complaints from their department
            complaints = await Complaint.find({department: user.department}).populate('userId','firstName lastName email');
        }
        else if(user.accountType === 'Admin'){
            // Admin can see all complaints
            complaints = await Complaint.find().populate('userId','firstName lastName email');
        }
        else{
            throw new ApiError(403, "Only citizens and staff can view complaints");
        }
        if(!complaints) throw new ApiError(404, "No complaints found");
        return res.status(200).json(new ApiResponse(200,complaints,"Complaints fetched successfully"));
    } catch (error) {
        throw new ApiError(error?.code || 500, error?.message || "Something went wrong while fetching the complaints");
    }
});

const getCitizenComplaints= asyncHandler(async (req,res)=>{
    try {
        const user = req.user._id ? await User.findById(req.user._id) : null;   
        if(!user) throw new ApiError(404, "User not found");
        if(user.accountType !== 'Citizen'){
            throw new ApiError(403, "Only citizens can view their complaints");
        }
        const complaints = await Complaint.find({userId:user._id}).populate('userId','firstName lastName email');
        if(!complaints) throw new ApiError(404, "No complaints found");
        return res.status(200).json(new ApiResponse(200,complaints,"Complaints fetched successfully"));
    } catch (error) {
        throw new ApiError(error?.code || 500, error?.message || "Something went wrong while fetching the complaints");
    }
});

const getComplaintById= asyncHandler(async (req,res)=>{
    try {
        const {id}= req.params; 
        const complaint = await Complaint.findById(id).populate({path:'userId',select:'firstName lastName email '});
        if(!complaint) throw new ApiError(404, "Complaint not found");
        return res.status(200).json(new ApiResponse(200,complaint,"Complaint fetched successfully"));
    } catch (error) {
        throw new ApiError(error?.code || 500, error?.message || "Something went wrong while fetching the complaint");
    }
});

const updateComplaint= asyncHandler(async (req,res)=>{
    try {
        const {id}= req.params;
        const {department,location,description}= req.body;
        const user = req.user._id ? await User.findById(req.user._id) : null;
        if(!user) throw new ApiError(404, "User not found");
        if(user.accountType !== 'Staff'){
            throw new ApiError(403, "Only staff can update complaints");
        }
        const complaint = await Complaint.findById(id);
        if(!complaint) throw new ApiError(404, "Complaint not found");
        const newComplaint = await Complaint.findByIdAndUpdate(id,{
            department: department || complaint.department,
            location: location || complaint.location,
            description: description || complaint.description,
            updatedAt: Date.now(),
        },{new:true});
        return res.status(200).json(new ApiResponse(200,newComplaint,"Complaint updated successfully"));
    } catch (error) {
        throw new ApiError(error?.code || 500, error?.message || "Something went wrong while updating the complaint");
    }
});

const getComplaintsByDepartment= asyncHandler(async (req,res)=>{
    try {
        const {department}= req.body;
        const user = req.user._id ? await User.findById(req.user._id) : null;
        if(!user) throw new ApiError(404, "User not found");
        if(user.accountType !== 'Staff'){
            throw new ApiError(403, "Only staff can view complaints by department");
        }
        const complaints=await Complaint.find({department}).populate( {path: 'userId', select:'firstName lastName email'});
        if(!complaints) throw new ApiError(404, "No complaints found for this department");
        return res.status(200).json(new ApiResponse(200,complaints,"Complaints fetched successfully by department"));
    } catch (error) {
        throw new ApiError(500,"something went wrong while fetching complaints by department")
    }
});

const getComplaintsByStatus= asyncHandler(async(req,res)=>{
    try {
        const user=req.user._id ? await User.findById(req.user._id) : null;
        if(!user) throw new ApiError(404,"User not found");
        const {status}= req.body;
        const complaints= await Complaint.find({status}).populate({path:'userId',select:'firstName lastName email'});
        if(!complaints) throw new ApiError(404,"No complaints found for this status");
        return res.status(200).json(new ApiResponse(200,complaints,"Complaints fetched successfully by status"));
    } catch (error) {
        throw new ApiError(500,"something wents wrong while fetching complaints by status");
    }
});

const getComplaintsByfilter=asyncHandler(async(req,res)=>{
    try {
        const user=req.user._id ? await User.findById(req.user._id) : null;
        if(!user) throw new ApiError(404,"User not found");
        const credentails=req.body;
        const complaints= await Complaint.find(credentails).populate({path:'userId',select:'firstName lastName email'});
        if(!complaints) throw new ApiError(404,"No complaints found for this filter");
        return res.status(200).json(new ApiResponse(200,complaints,"Complaints fetched successfully by filter"));
    } catch (error) {
        throw new ApiError(500,"somethind wents wrong while fetching complaints by filter")
    }
});


export const getresolvedComplaints = asyncHandler(async (req, res) => {
  try {
    // check user
    const user = req.user._id ? await User.findById(req.user._id) : null;
    if (!user) throw new ApiError(404, "User not found");

    if (user.accountType !== 'Staff' && user.accountType !== 'Admin') {
      throw new ApiError(403, "Only staff can view resolved complaints");
    }

    // get resolved complaints
    let complaintsQuery = { status: 'resolved' };
    
    // Staff can only see resolved complaints from their department
    if (user.accountType === 'Staff') {
      complaintsQuery.department = user.department;
    }
    
    const complaints = await Complaint.find(complaintsQuery)
      .populate({ path: 'userId', select: 'firstName lastName email' });

    if (!complaints || complaints.length === 0)
      throw new ApiError(404, "No resolved complaints found");

    // attach time taken inside complaint object
    const complaintsWithTime = complaints.map(c => {
      const complaintObj = c.toObject(); // convert Mongoose doc to plain object
      if (complaintObj.resolvedAt && complaintObj.createdAt) {
        const diffMs = complaintObj.resolvedAt - complaintObj.createdAt;
        // convert to hours (or days)
        complaintObj.timeTakenToResolveHours = Math.round(diffMs / (1000 * 60 * 60));
      } else {
        complaintObj.timeTakenToResolveHours = null;
      }
      return complaintObj;
    });

    return res
      .status(200)
      .json(new ApiResponse(200, complaintsWithTime, "Resolved complaints fetched successfully"));
  } catch (error) {
    throw new ApiError(500, "Something went wrong while fetching resolved complaints");
  }
});


export {createComplaint,
        getAllComplaints,
        deleteComplaint,
        changeProgressStatus,
        getCitizenComplaints,
        getComplaintById,
        updateComplaint,
        getComplaintsByDepartment,
        getComplaintsByStatus,
        getComplaintsByfilter
        };