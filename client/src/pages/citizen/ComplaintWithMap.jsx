// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
// import L from 'leaflet';
// import 'leaflet/dist/leaflet.css';
// import axios from "axios";

// // Fix for default markers in React-Leaflet
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
//   iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
// });

// const BASE_URL = import.meta.env.VITE_API_BASE_URL;
// // Component to handle map click events
// const LocationPicker = ({ onLocationSelect }) => {
//   useMapEvents({
//     click: (e) => {
//       const { lat, lng } = e.latlng;
//       onLocationSelect(lat, lng);
//     },
//   });
//   return null;
// };

// export default function ComplaintWithMap() {
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

//     const handleLocationSelect = (lat, lng) => {
//         setFormData(prev => ({
//             ...prev,
//             coordinates: { lat, lng },
//             location: prev.location || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
//         }));
//     };

//     const getCurrentLocation = () => {
//         if (navigator.geolocation) {
//             navigator.geolocation.getCurrentPosition(
//                 (position) => {
//                     const { latitude, longitude } = position.coords;
//                     handleLocationSelect(latitude, longitude);
//                     setMessage("Location detected successfully!");
//                 },
//                 (error) => {
//                     setMessage("Unable to get your location. Please select manually on map.");
//                 }
//             );
//         } else {
//             setMessage("Geolocation is not supported by this browser.");
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
            
//             // Add coordinates if available
//             if (formData.coordinates.lat && formData.coordinates.lng) {
//                 formDataToSend.append("latitude", formData.coordinates.lat);
//                 formDataToSend.append("longitude", formData.coordinates.lng);
//             }

//             const token = localStorage.getItem('accessToken');
            
//             if (!token) {
//                 setMessage('Please login first');
//                 setLoading(false);
//                 return;
//             }
            
//             const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/complaints/createComplaint`, formDataToSend, {
//                 headers: { 
//                     "Content-Type": "multipart/form-data",
//                     "Authorization": `Bearer ${token}`
//                 },
//                 withCredentials: true
//             });

//             setMessage("Complaint submitted successfully!");
//             setFormData({ 
//                 department: "", 
//                 location: "", 
//                 coordinates: { lat: null, lng: null },
//                 description: "", 
//                 image: null 
//             });
//         } catch (error) {
//             const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to submit complaint";
//             setMessage(errorMessage);
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div className="min-h-screen bg-gray-50 py-8">
//             <div className="max-w-4xl mx-auto px-4">
//                 <div className="bg-white rounded-xl shadow-md p-8">
//                     <div className="flex items-center justify-between mb-6">
//                         <h1 className="text-2xl font-bold text-gray-900">Submit Complaint with Location</h1>
//                         <button
//                             onClick={() => navigate("/citizen")}
//                             className="text-blue-600 cursor-pointer hover:text-blue-800 font-medium"
//                         >
//                             ← Back to Dashboard
//                         </button>
//                     </div>

//                     {message && (
//                         <div className={`mb-4 p-4 rounded-lg text-center ${
//                             message.includes("successfully") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
//                         }`}>
//                             {message}
//                         </div>
//                     )}

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
//                                     placeholder="Enter address or use location tools below"
//                                     required
//                                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                                 />
                                
//                                 <div className="flex gap-2">
//                                     <button
//                                         type="button"
//                                         onClick={getCurrentLocation}
//                                         className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer"
//                                     >
//                                         📍 Use My Location
//                                     </button>
//                                     <button
//                                         type="button"
//                                         onClick={() => setShowMap(!showMap)}
//                                         className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer"
//                                     >
//                                         {showMap ? "Hide Map" : "🗺️ Select on Map"}
//                                     </button>
//                                 </div>

//                                 {formData.coordinates.lat && (
//                                     <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
//                                         📍 Location selected: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
//                                     </div>
//                                 )}

//                                 {showMap && (
//                                     <div className="border border-gray-300 rounded-lg overflow-hidden">
//                                         <div className="h-64">
//                                             <MapContainer
//                                                 center={formData.coordinates.lat ? [formData.coordinates.lat, formData.coordinates.lng] : [26.8467, 80.9462]}
//                                                 zoom={13}
//                                                 style={{ height: '100%', width: '100%' }}
//                                             >
//                                                 <TileLayer
//                                                     url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//                                                     attribution="&copy; OpenStreetMap contributors"
//                                                 />
//                                                 <LocationPicker onLocationSelect={handleLocationSelect} />
//                                                 {formData.coordinates.lat && (
//                                                     <Marker position={[formData.coordinates.lat, formData.coordinates.lng]} />
//                                                 )}
//                                             </MapContainer>
//                                         </div>
//                                         <div className="p-2 bg-gray-50 text-sm text-gray-600">
//                                             Click anywhere on the map to select location
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
//                 </div>
//             </div>
//         </div>
//     );
// }
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from "axios";

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
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
    "Other": "Public Works Department (PWD)",
};

const SEVERITY_STYLES = {
    critical: "bg-red-100 text-red-700 border-red-300",
    high: "bg-orange-100 text-orange-700 border-orange-300",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
    low: "bg-green-100 text-green-700 border-green-300",
};

const DEBOUNCE_MS = 1200;

// Component to handle map click events
const LocationPicker = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });
  return null;
};

export default function ComplaintWithMap() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        location: "",
        coordinates: { lat: null, lng: null },
        description: "",
        image: null
    });
    const [showMap, setShowMap] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    // Department/hazard/severity are 100% derived from the model — no manual selection.
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

    // Auto-trigger once the user pauses typing
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            runPrediction(formData.description);
        }, DEBOUNCE_MS);
        return () => clearTimeout(debounceRef.current);
    }, [formData.description, runPrediction]);

    const handleChange = (e) => {
        if (e.target.name === "image") {
            setFormData({ ...formData, image: e.target.files[0] });
        } else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handleLocationSelect = (lat, lng) => {
        setFormData(prev => ({
            ...prev,
            coordinates: { lat, lng },
            location: prev.location || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        }));
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    handleLocationSelect(latitude, longitude);
                    setMessage("Location detected successfully!");
                },
                (error) => {
                    setMessage("Unable to get your location. Please select manually on map.");
                }
            );
        } else {
            setMessage("Geolocation is not supported by this browser.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");

        if (!prediction || !department) {
            setMessage("Please wait for the system to analyze your description before submitting (or rewrite it — it couldn't be classified).");
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
            formDataToSend.append("department", department); // auto-assigned by the model
            formDataToSend.append("location", formData.location);
            formDataToSend.append("description", formData.description);
            formDataToSend.append("image", formData.image);
            formDataToSend.append("predictedHazardType", prediction.hazard_type);
            formDataToSend.append("predictedSeverity", prediction.severity);
            formDataToSend.append("predictionConfidence", prediction.confidence);
            formDataToSend.append("predictionMethod", prediction.method);

            if (formData.coordinates.lat && formData.coordinates.lng) {
                formDataToSend.append("latitude", formData.coordinates.lat);
                formDataToSend.append("longitude", formData.coordinates.lng);
            }

            await axios.post(`${BASE_URL}/api/complaints/createComplaint`, formDataToSend, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    "Authorization": `Bearer ${token}`
                },
                withCredentials: true
            });

            setMessage("Complaint submitted successfully!");
            setFormData({
                location: "",
                coordinates: { lat: null, lng: null },
                description: "",
                image: null
            });
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
            <div className="max-w-4xl mx-auto px-4">
                <div className="bg-white rounded-xl shadow-md p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Submit Complaint with Location</h1>
                        <button
                            onClick={() => navigate("/citizen")}
                            className="text-blue-600 cursor-pointer hover:text-blue-800 font-medium"
                        >
                            ← Back to Dashboard
                        </button>
                    </div>

                    {message && (
                        <div className={`mb-4 p-4 rounded-lg text-center ${
                            message.includes("successfully") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* DESCRIPTION — drives everything below */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description *
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe the issue in detail..."
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
                                    Department and hazard details will appear here once you finish typing the description.
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
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="Enter address or use location tools below"
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={getCurrentLocation}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer"
                                    >
                                        📍 Use My Location
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowMap(!showMap)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer"
                                    >
                                        {showMap ? "Hide Map" : "🗺️ Select on Map"}
                                    </button>
                                </div>

                                {formData.coordinates.lat && (
                                    <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                                        📍 Location selected: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
                                    </div>
                                )}

                                {showMap && (
                                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                                        <div className="h-64">
                                            <MapContainer
                                                center={formData.coordinates.lat ? [formData.coordinates.lat, formData.coordinates.lng] : [26.8467, 80.9462]}
                                                zoom={13}
                                                style={{ height: '100%', width: '100%' }}
                                            >
                                                <TileLayer
                                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                    attribution="&copy; OpenStreetMap contributors"
                                                />
                                                <LocationPicker onLocationSelect={handleLocationSelect} />
                                                {formData.coordinates.lat && (
                                                    <Marker position={[formData.coordinates.lat, formData.coordinates.lng]} />
                                                )}
                                            </MapContainer>
                                        </div>
                                        <div className="p-2 bg-gray-50 text-sm text-gray-600">
                                            Click anywhere on the map to select location
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
                                name="image"
                                onChange={handleChange}
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
                </div>
            </div>
        </div>
    );
}