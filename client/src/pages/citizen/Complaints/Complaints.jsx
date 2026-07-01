// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";

// export default function Complaints() {
//     const navigate = useNavigate();
//     const [formData, setFormData] = useState({
//         department: "",
//         location: "",
//         coordinates: { lat: null, lng: null },
//         description: "",
//         image: null
//     });
//     const [showMap, setShowMap] = useState(false);
//     const [loading, setLoading] = useState(false);
//     const [message, setMessage] = useState("");

//     const BASE_URL = import.meta.env.VITE_API_BASE_URL;

//     const departments = [
//         "Public Works Department (PWD)",
//         "Sanitation Department",
//         "Water Supply Department",
//         "Electricity Department",
//         "Parks & Environment Department"
//     ];

//     const handleChange = (e) => {
//         if (e.target.name === "image") {
//             setFormData({ ...formData, image: e.target.files[0] });
//         } else {
//             setFormData({ ...formData, [e.target.name]: e.target.value });
//         }
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         setLoading(true);
//         setMessage("");

//         try {
//             const formDataToSend = new FormData();
//             formDataToSend.append("department", formData.department);
//             formDataToSend.append("location", formData.location);
//             formDataToSend.append("description", formData.description);
//             formDataToSend.append("image", formData.image);

//             const token = localStorage.getItem('accessToken');

//             if (!token) {
//                 setMessage('Please login first');
//                 setLoading(false);
//                 return;
//             }

//             const res = await axios.post(`${BASE_URL}/api/complaints/createComplaint`, formDataToSend, {
//                 headers: {
//                     "Content-Type": "multipart/form-data",
//                     "Authorization": `Bearer ${token}`
//                 },
//                 withCredentials: true
//             });

//             setMessage("Complaint submitted successfully!");
//             setFormData({ department: "", location: "", description: "", image: null });
//         } catch (error) {
//             const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to submit complaint";
//             setMessage(errorMessage);
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div className="min-h-screen bg-gray-50 py-8">
//             <div className="max-w-2xl mx-auto px-4">
//                 <div className="bg-white rounded-xl shadow-md p-8">
//                     <div className="flex items-center justify-between mb-6">
//                         <h1 className="text-2xl font-bold text-gray-900">Submit Complaint</h1>
//                         <button
//                             onClick={() => navigate("/citizen")}
//                             className="text-blue-600 cursor-pointer hover:text-blue-800 font-medium"
//                         >
//                             ← Back to Dashboard
//                         </button>
//                     </div>

//                     <form onSubmit={handleSubmit} className="space-y-6">
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Department *
//                             </label>
//                             <select
//                                 name="department"
//                                 value={formData.department}
//                                 onChange={handleChange}
//                                 required
//                                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                             >
//                                 <option value="">Select Department</option>
//                                 {departments.map((dept, index) => (
//                                     <option key={index} value={dept}>{dept}</option>
//                                 ))}
//                             </select>
//                         </div>

//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Location *
//                             </label>
//                             <div className="space-y-3">
//                                 <input
//                                     type="text"
//                                     name="location"
//                                     value={formData.location}
//                                     onChange={handleChange}
//                                     placeholder="Enter address or click 'Select on Map'"
//                                     required
//                                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                                 />
//                                 <button
//                                     type="button"
//                                     onClick={() => setShowMap(!showMap)}
//                                     className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer"
//                                 >
//                                     {showMap ? "Hide Map" : "📍 Select on Map"}
//                                 </button>
//                                 {showMap && (
//                                     <div className="border border-gray-300 rounded-lg overflow-hidden">
//                                         <div className="h-64 bg-gray-200 flex items-center justify-center">
//                                             <div className="text-center">
//                                                 <div className="text-4xl mb-2">🗺️</div>
//                                                 <p className="text-gray-600">Interactive Map</p>
//                                                 <p className="text-sm text-gray-500 mt-2">Click to select location</p>
//                                                 {formData.coordinates.lat && (
//                                                     <p className="text-xs text-green-600 mt-1">
//                                                         Selected: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
//                                                     </p>
//                                                 )}
//                                             </div>
//                                         </div>
//                                     </div>
//                                 )}
//                             </div>
//                         </div>

//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Description *
//                             </label>
//                             <textarea
//                                 name="description"
//                                 value={formData.description}
//                                 onChange={handleChange}
//                                 placeholder="Describe the issue in detail..."
//                                 required
//                                 rows={4}
//                                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                             />
//                         </div>

//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Upload Image *
//                             </label>
//                             <input
//                                 type="file"
//                                 name="image"
//                                 onChange={handleChange}
//                                 accept="image/*"
//                                 required
//                                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                             />
//                         </div>

//                         <button
//                             type="submit"
//                             disabled={loading}
//                             className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 hover:scale-105 transition cursor-pointer disabled:opacity-50"
//                         >
//                             {loading ? "Submitting..." : "Submit Complaint"}
//                         </button>
//                     </form>

//                     {message && (
//                         <div className={`mt-4 p-4 rounded-lg text-center ${message.includes("successfully") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
//                             }`}>
//                             {message}
//                         </div>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// }

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ML_SERVER_URL = import.meta.env.VITE_ML_SERVER_URL || "http://localhost:5000";

// Maps the ML model's hazard_type output to the department that handles it.
// Edit this if your model's categories differ.
const HAZARD_TO_DEPARTMENT = {
    "Potholes": "Public Works Department (PWD)",
    "Road Damage": "Public Works Department (PWD)",
    "Illegal Construction": "Public Works Department (PWD)",
    "Electrical Hazards": "Electricity Department",
    "Street Lights": "Electricity Department",
    "Garbage Collection": "Sanitation Department",
    "Sewage & Drainage": "Sanitation Department",
    "Water Supply": "Water Supply Department",
    "Noise Pollution": "Parks & Environment Department",
    "Public Safety": "Public Works Department (PWD)",
    "Other": "Public Works Department (PWD)", // fallback so a department is always assigned
};

const SEVERITY_STYLES = {
    critical: "bg-red-100 text-red-700 border-red-300",
    high: "bg-orange-100 text-orange-700 border-orange-300",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
    low: "bg-green-100 text-green-700 border-green-300",
};

const DEBOUNCE_MS = 1200; // "upon description completion" = user pauses typing for this long

export default function Complaints() {
    const navigate = useNavigate();
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [coordinates, setCoordinates] = useState({ lat: null, lng: null });
    const [image, setImage] = useState(null);
    const [showMap, setShowMap] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    // Everything below this point is 100% derived from the model. No manual override.
    const [prediction, setPrediction] = useState(null); // { hazard_type, severity, confidence, method }
    const [predicting, setPredicting] = useState(false);
    const [predictionError, setPredictionError] = useState("");

    const debounceRef = useRef(null);

    const department = prediction ? HAZARD_TO_DEPARTMENT[prediction.hazard_type] || null : null;

    const runPrediction = useCallback(async (text) => {
        if (!text || text.trim().length < 5) {
            setPrediction(null);
            setPredictionError("");
            return;
        }
        setPredicting(true);
        setPredictionError("");
        try {
            const res = await axios.post(
                `${ML_SERVER_URL}/predict`,
                { description: text },
                { timeout: 6000 }
            );
            if (res.data?.success) {
                setPrediction(res.data);
            } else {
                setPrediction(null);
                setPredictionError("Model could not classify this description.");
            }
        } catch (err) {
            setPrediction(null);
            setPredictionError("ML server unreachable — make sure smart_server.py is running on port 5000.");
            console.warn("Prediction failed:", err.message);
        } finally {
            setPredicting(false);
        }
    }, []);

    // Auto-trigger once the user pauses typing (i.e. "completes" the description)
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            runPrediction(description);
        }, DEBOUNCE_MS);
        return () => clearTimeout(debounceRef.current);
    }, [description, runPrediction]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");

        if (!prediction || !department) {
            setMessage("Please wait for the system to analyze your description before submitting (or rewrite it — it couldn't be classified).");
            return;
        }
        if (!image) {
            setMessage("Please upload an image.");
            return;
        }
        if (!location) {
            setMessage("Please enter a location.");
            return;
        }

        const token = localStorage.getItem('accessToken');
        if (!token) {
            setMessage('Please login first');
            return;
        }

        setLoading(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append("department", department);          // auto-assigned, not user input
            formDataToSend.append("location", location);
            formDataToSend.append("description", description);
            formDataToSend.append("image", image);
            formDataToSend.append("predictedHazardType", prediction.hazard_type);
            formDataToSend.append("predictedSeverity", prediction.severity);
            formDataToSend.append("predictionConfidence", prediction.confidence);
            formDataToSend.append("predictionMethod", prediction.method);

            const BASE_URL = import.meta.env.VITE_API_BASE_URL;
            await axios.post(`${BASE_URL}/api/complaints/createComplaint`, formDataToSend, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    "Authorization": `Bearer ${token}`
                },
                withCredentials: true
            });

            setMessage("Complaint submitted successfully!");
            setDescription("");
            setLocation("");
            setCoordinates({ lat: null, lng: null });
            setImage(null);
            setPrediction(null);
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to submit complaint";
            setMessage(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-2xl mx-auto px-4">
                <div className="bg-white rounded-xl shadow-md p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Submit Complaint</h1>
                        <button
                            onClick={() => navigate("/citizen")}
                            className="text-blue-600 cursor-pointer hover:text-blue-800 font-medium"
                        >
                            ← Back to Dashboard
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* DESCRIPTION — the only thing the model needs */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Describe the issue *
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g. 'Large pothole on main road causing accidents near the bus stop'"
                                required
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Department, hazard type, and severity are assigned automatically from this description.
                            </p>
                        </div>

                        {/* AUTO-ASSIGNED RESULTS — read-only, driven entirely by the model */}
                        <div className="border rounded-lg p-4 bg-gray-50">
                            {predicting && (
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <span className="animate-pulse">🤖 Analyzing description...</span>
                                </p>
                            )}

                            {!predicting && predictionError && (
                                <p className="text-sm text-red-600">⚠️ {predictionError}</p>
                            )}

                            {!predicting && !predictionError && !prediction && (
                                <p className="text-sm text-gray-400">
                                    Department and hazard details will appear here once you finish typing.
                                </p>
                            )}

                            {!predicting && prediction && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Department</span>
                                        <span className="font-semibold text-gray-900">{department}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Hazard Type</span>
                                        <span className="font-semibold text-gray-900">{prediction.hazard_type}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Severity</span>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${SEVERITY_STYLES[prediction.severity] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
                                            {prediction.severity?.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-400 pt-1 border-t">
                                        <span>Confidence: {Math.round((prediction.confidence || 0) * 100)}%</span>
                                        <span>{prediction.method === "keyword_fallback" ? "fallback mode (model unavailable)" : "ML model"}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Location *
                            </label>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="Enter address or click 'Select on Map'"
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowMap(!showMap)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer"
                                >
                                    {showMap ? "Hide Map" : "📍 Select on Map"}
                                </button>
                                {showMap && (
                                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                                        <div className="h-64 bg-gray-200 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-4xl mb-2">🗺️</div>
                                                <p className="text-gray-600">Interactive Map</p>
                                                <p className="text-sm text-gray-500 mt-2">Click to select location</p>
                                                {coordinates.lat && (
                                                    <p className="text-xs text-green-600 mt-1">
                                                        Selected: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Upload Image *
                            </label>
                            <input
                                type="file"
                                onChange={(e) => setImage(e.target.files[0])}
                                accept="image/*"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || predicting || !prediction}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 hover:scale-105 transition cursor-pointer disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? "Submitting..." : predicting ? "Analyzing description..." : "Submit Complaint"}
                        </button>
                    </form>

                    {message && (
                        <div className={`mt-4 p-4 rounded-lg text-center ${message.includes("successfully") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}