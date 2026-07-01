// import mongoose from 'mongoose';

// const complaintSchema = new mongoose.Schema({
//   department: { 
//     type: String, 
//     required: true,
//     enum: [
//       'Public Works Department (PWD)',
//       'Sanitation Department',
//       'Water Supply Department', 
//       'Electricity Department',
//       'Parks & Environment Department'
//     ]
//   },
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   status: { type: String, enum: ['open', 'in-progress', 'resolved','rejected'], default: 'open' },
//   location: { type: String, required: true },
//   latitude: { type: Number, required: false },
//   longitude: { type: Number, required: false }, 
//   imageUrl: { type: String , required: true},
//   description: { type: String , required: true },
//   escalationLevel: { type: String, enum: ['staff', 'admin', 'superadmin'], default: 'staff' },
//   escalatedAt: { type: Date, default: null },
//   isEscalated: { type: Boolean, default: false }, // ✅ new field
//   resolvedAt: { type: Date, default: null },
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
//   overdue: { type: Boolean, default: false },
// }, { timestamps: true });

// const Complaint = mongoose.model('Complaint', complaintSchema);
// export default Complaint;
import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  department: { 
    type: String, 
    required: true,
    enum: [
      'Public Works Department (PWD)',
      'Sanitation Department',
      'Water Supply Department', 
      'Electricity Department',
      'Parks & Environment Department'
    ]
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['open', 'in-progress', 'resolved','rejected'], default: 'open' },
  location: { type: String, required: true },
  latitude: { type: Number, required: false },
  longitude: { type: Number, required: false }, 
  imageUrl: { type: String , required: true},
  description: { type: String , required: true },

  // ML prediction metadata (from ml-server/ml-server/smart_server.py)
  predictedHazardType: { type: String, default: null },
  predictedSeverity: { type: String, enum: ['critical', 'high', 'medium', 'low', null], default: null },
  predictionConfidence: { type: Number, default: null },
  predictionMethod: { type: String, enum: ['ml_model', 'keyword_fallback', null], default: null },

  escalationLevel: { type: String, enum: ['staff', 'admin', 'superadmin'], default: 'staff' },
  escalatedAt: { type: Date, default: null },
  isEscalated: { type: Boolean, default: false }, // ✅ new field
  resolvedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  overdue: { type: Boolean, default: false },
}, { timestamps: true });

const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;