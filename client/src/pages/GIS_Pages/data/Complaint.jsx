import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Red marker icon for complaint location
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Green marker icon for device location
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Component to handle map click events
const LocationPicker = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng, 'map');
    },
  });
  return null;
};

// Component to handle automatic map centering
const MapController = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && map) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);

  return null;
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error in Map component:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-96 bg-red-50 border border-red-200 rounded-md flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-2xl mb-2">⚠️</div>
            <p className="text-red-700 font-medium">Map failed to load</p>
            <p className="text-red-600 text-sm mt-1">Please refresh the page or try again later</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ComplaintForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    complaintType: '',
    description: '',
    address: '',
    latitude: null,
    longitude: null,
    urgency: 'medium',
    department: '' // New field for department
  });

  const [mapCenter, setMapCenter] = useState([26.8467, 80.9462]);
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [locationMethod, setLocationMethod] = useState(null);
  const [predictionStatus, setPredictionStatus] = useState('idle');
  const [autoDetected, setAutoDetected] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');

  const FLASK_SERVER_URL = import.meta.env.VITE_ML_SERVER_URL;

  // Department mapping based on problem type
  const departmentMapping = {
    'Potholes': 'Road Maintenance Department',
    'Road Damage': 'Road Maintenance Department',
    'Electrical Hazards': 'Electrical Department',
    'Water Supply': 'Water Department',
    'Sewage & Drainage': 'Sewage Department',
    'Garbage Collection': 'Sanitation Department',
    'Street Lights': 'Electrical Department',
    'Noise Pollution': 'Environmental Department',
    'Illegal Construction': 'Building Department',
    'Public Safety': 'Police Department',
    'Other': 'General Complaints Department'
  };

  // Check server health on component mount
  useEffect(() => {
    checkServerHealth();
  }, []);

  // Auto-assign department when complaint type changes
  useEffect(() => {
    if (formData.complaintType && departmentMapping[formData.complaintType]) {
      setFormData(prev => ({
        ...prev,
        department: departmentMapping[formData.complaintType]
      }));
    }
  }, [formData.complaintType]);

  const checkServerHealth = async () => {
    try {
      const response = await fetch(`${FLASK_SERVER_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        setServerStatus(data.model_loaded ? 'healthy' : 'fallback');
      } else {
        setServerStatus('offline');
      }
    } catch (error) {
      console.error('Server health check failed:', error);
      setServerStatus('offline');
    }
  };

  const predictComplaint = async (description) => {
    if (!description || description.trim().length < 10) {
      return null;
    }

    setPredictionStatus('loading');
    
    try {
      const response = await fetch(`${FLASK_SERVER_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: description }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Prediction failed');
      }

      setPredictionStatus('success');
      return result;
    } catch (error) {
      console.error('Error predicting complaint:', error);
      setPredictionStatus('error');
      
      // Use client-side fallback as last resort
      const fallbackResult = fallbackPrediction(description);
      return fallbackResult;
    }
  };

  // Enhanced client-side fallback
  const fallbackPrediction = (description) => {
    const descriptionLower = description.toLowerCase();
    
    const hazardKeywords = [
      { keyword: "pothole", type: "Potholes" },
      { keyword: "road damage", type: "Road Damage" },
      { keyword: "road broken", type: "Road Damage" },
      { keyword: "electrical", type: "Electrical Hazards" },
      { keyword: "electric", type: "Electrical Hazards" },
      { keyword: "wire", type: "Electrical Hazards" },
      { keyword: "water", type: "Water Supply" },
      { keyword: "sewage", type: "Sewage & Drainage" },
      { keyword: "drain", type: "Sewage & Drainage" },
      { keyword: "garbage", type: "Garbage Collection" },
      { keyword: "trash", type: "Garbage Collection" },
      { keyword: "street light", type: "Street Lights" },
      { keyword: "light", type: "Street Lights" },
      { keyword: "safety", type: "Public Safety" },
      { keyword: "noise", type: "Noise Pollution" },
      { keyword: "construction", type: "Illegal Construction" }
    ];
    
    const severityKeywords = [
      { keyword: "critical", severity: "critical" },
      { keyword: "emergency", severity: "critical" },
      { keyword: "urgent", severity: "high" },
      { keyword: "danger", severity: "high" },
      { keyword: "dangerous", severity: "high" }
    ];
    
    // Find the best matching hazard type
    let detectedHazard = "Other";
    let bestMatchLength = 0;
    
    hazardKeywords.forEach(({ keyword, type }) => {
      if (descriptionLower.includes(keyword) && keyword.length > bestMatchLength) {
        detectedHazard = type;
        bestMatchLength = keyword.length;
      }
    });
    
    // Detect severity
    let detectedSeverity = "medium";
    severityKeywords.forEach(({ keyword, severity }) => {
      if (descriptionLower.includes(keyword)) {
        detectedSeverity = severity;
      }
    });
    
    return {
      hazard_type: detectedHazard,
      severity: detectedSeverity,
      confidence: 0.6,
      fallback: true,
      success: true
    };
  };

  // Debounced description analysis
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.description && formData.description.length >= 10) {
        const prediction = await predictComplaint(formData.description);
        
        if (prediction) {
          setFormData(prev => ({
            ...prev,
            complaintType: prediction.hazard_type,
            urgency: prediction.severity,
            department: departmentMapping[prediction.hazard_type] || 'General Complaints Department'
          }));
          setAutoDetected(true);
        }
      }
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timer);
  }, [formData.description]);

  // Get device location using Geolocation API
  const getDeviceLocation = () => {
    setLocationStatus('loading');
    
    if (!navigator.geolocation) {
      setLocationStatus('error');
      alert('Geolocation is not supported by your browser');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
          setLocationStatus('error');
          alert('Invalid location data received. Please try again or select manually.');
          return;
        }

        setDeviceLocation({ latitude, longitude });
        setMapCenter([latitude, longitude]);
        
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude
        }));
        
        setLocationStatus('success');
        setLocationMethod('device');
        getAddressFromCoordinates(latitude, longitude);
      },
      (error) => {
        setLocationStatus('error');
        console.error('Error getting location:', error);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('Location access denied. Please allow location access or select manually from the map.');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('Location information unavailable. Please select manually from the map.');
            break;
          case error.TIMEOUT:
            alert('Location request timed out. Please try again or select manually from the map.');
            break;
          default:
            alert('An unknown error occurred while getting location.');
            break;
        }
      },
      options
    );
  };

  // Reverse geocoding to get address from coordinates
  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.display_name) {
          setFormData(prev => ({
            ...prev,
            address: data.display_name
          }));
        }
      }
    } catch (error) {
      console.error('Error getting address:', error);
    }
  };

  // Manual address search
  const searchAddress = async () => {
    if (!formData.address || formData.address.trim() === '') {
      alert('Please enter an address to search');
      return;
    }

    setLocationStatus('loading');
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const { lat, lon, display_name } = data[0];
          const latitude = parseFloat(lat);
          const longitude = parseFloat(lon);
          
          if (isNaN(latitude) || isNaN(longitude)) {
            throw new Error('Invalid coordinates received');
          }
          
          setMapCenter([latitude, longitude]);
          
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude,
            address: display_name
          }));
          
          setLocationStatus('success');
          setLocationMethod('manual');
        } else {
          setLocationStatus('error');
          alert('Address not found. Please try a different address or select from the map.');
        }
      }
    } catch (error) {
      setLocationStatus('error');
      console.error('Error searching address:', error);
      alert('Error searching address. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Reset auto-detected status if user manually changes type or urgency
    if ((name === 'complaintType' || name === 'urgency') && autoDetected) {
      setAutoDetected(false);
    }

    // Auto-assign department when complaint type is manually changed
    if (name === 'complaintType' && value && departmentMapping[value]) {
      setFormData(prev => ({
        ...prev,
        department: departmentMapping[value]
      }));
    }
  };

  const handleLocationSelect = (lat, lng, method = 'map') => {
    if (isNaN(lat) || isNaN(lng)) {
      alert('Invalid location selected. Please try again.');
      return;
    }

    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
    
    setMapCenter([lat, lng]);
    setLocationMethod(method);
    setLocationStatus('success');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.latitude || !formData.longitude) {
      alert('Please select a location for your complaint');
      return;
    }
    
    if (!formData.name || !formData.phone || !formData.complaintType || !formData.description) {
      alert('Please fill all required fields');
      return;
    }
    
    try {
      const existingComplaints = JSON.parse(localStorage.getItem('complaints') || '[]');
      
      const newComplaint = {
        id: Date.now(),
        ...formData,
        locationMethod: locationMethod,
        autoDetected: autoDetected,
        status: 'pending',
        assignedDepartment: formData.department,
        createdAt: new Date().toISOString()
      };
      
      const updatedComplaints = [...existingComplaints, newComplaint];
      localStorage.setItem('complaints', JSON.stringify(updatedComplaints));
      
      alert(`Complaint registered successfully!\n\nAssigned to: ${formData.department}`);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        complaintType: '',
        description: '',
        address: '',
        latitude: null,
        longitude: null,
        urgency: 'medium',
        department: ''
      });
      
      setLocationStatus('idle');
      setLocationMethod(null);
      setDeviceLocation(null);
      setMapCenter([26.8467, 80.9462]);
      setAutoDetected(false);
      setPredictionStatus('idle');
      
    } catch (error) {
      console.error('Error saving complaint:', error);
      alert('Error saving complaint. Please try again.');
    }
  };

  const clearLocation = () => {
    setFormData(prev => ({
      ...prev,
      latitude: null,
      longitude: null,
      address: ''
    }));
    setLocationStatus('idle');
    setLocationMethod(null);
    setDeviceLocation(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Register Civic Complaint
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Complaint Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email (optional)"
                />
              </div>

              {/* Auto-detected Complaint Type, Severity and Department */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Problem Type *
                      {autoDetected && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          🤖 Auto-detected
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="complaintType"
                      value={formData.complaintType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Will be auto-detected"
                      readOnly={autoDetected}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Severity Level *
                      {autoDetected && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          🤖 Auto-detected
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="urgency"
                      value={formData.urgency}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                      placeholder="Will be auto-detected"
                      readOnly={autoDetected}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Department *
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      readOnly
                      className="w-full px-3 py-2 border border-green-300 bg-green-50 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
                      placeholder="Auto-assigned based on problem"
                    />
                  </div>
                </div>

                {/* Department Assignment Info */}
                {formData.department && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="text-sm text-green-800 flex items-center">
                      <span className="mr-2">🏢</span>
                      <div>
                        <strong>Automatically Assigned to:</strong> {formData.department}
                        <br />
                        <span className="text-green-600">
                          Based on problem type: {formData.complaintType}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Prediction Status */}
              {predictionStatus === 'loading' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="text-sm text-blue-800 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800 mr-2"></div>
                    🤖 AI is analyzing description and detecting problem type, severity, and department...
                  </div>
                </div>
              )}

              {predictionStatus === 'error' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="text-sm text-yellow-800">
                    ⚠️ Auto-detection unavailable. Please manually enter problem type and severity.
                  </div>
                </div>
              )}

              {/* Location Section */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Location *
                </label>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={getDeviceLocation}
                    disabled={locationStatus === 'loading'}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {locationStatus === 'loading' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Detecting...
                      </>
                    ) : (
                      '📍 Use My Location'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={searchAddress}
                    disabled={locationStatus === 'loading'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                  >
                    🔍 Search Address
                  </button>
                  
                  {(formData.latitude && formData.longitude) && (
                    <button
                      type="button"
                      onClick={clearLocation}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      ❌ Clear Location
                    </button>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter address or use location buttons above"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {formData.latitude && formData.longitude && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="text-sm text-green-800">
                      <strong>📍 Location Selected:</strong><br />
                      Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}<br />
                      Method: {locationMethod === 'device' ? 'Device GPS' : locationMethod === 'manual' ? 'Address Search' : 'Map Click'}
                    </div>
                  </div>
                )}

                {locationStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="text-sm text-red-800">
                      <strong>⚠️ Location Error:</strong> Please select location manually from the map.
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                  <span className="text-xs text-gray-500 ml-2">
                    (Type at least 10 characters for auto-detection)
                  </span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Please describe the issue in detail. Our AI will automatically detect the problem type, severity level, and assign to the appropriate department."
                />
              </div>

              {/* Summary Card */}
              {(formData.complaintType || formData.department) && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">📋 Complaint Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {formData.complaintType && (
                      <div>
                        <span className="font-medium text-blue-700">Problem Type:</span> {formData.complaintType}
                      </div>
                    )}
                    {formData.urgency && (
                      <div>
                        <span className="font-medium text-blue-700">Severity:</span> 
                        <span className={`ml-1 capitalize ${
                          formData.urgency === 'critical' ? 'text-red-600 font-bold' :
                          formData.urgency === 'high' ? 'text-orange-600 font-semibold' :
                          formData.urgency === 'medium' ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {formData.urgency}
                        </span>
                      </div>
                    )}
                    {formData.department && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-blue-700">Assigned Department:</span> 
                        <span className="ml-1 font-semibold text-green-700">{formData.department}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!formData.latitude || locationStatus === 'loading' || !formData.complaintType}
                className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                  formData.latitude && locationStatus !== 'loading' && formData.complaintType
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }`}
              >
                {locationStatus === 'loading' ? 'Processing...' : 'Submit Complaint'}
              </button>
            </form>
          </div>

          {/* Map for Location Selection */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold mb-4">Select Complaint Location</h3>
            
            <ErrorBoundary>
              <div className="h-96 rounded-md overflow-hidden border-2 border-gray-300">
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />
                  
                  <MapController center={mapCenter} zoom={13} />
                  <LocationPicker onLocationSelect={handleLocationSelect} />
                  
                  {deviceLocation && (
                    <Marker
                      position={[deviceLocation.latitude, deviceLocation.longitude]}
                      icon={greenIcon}
                    >
                      <Popup>Your Current Location</Popup>
                    </Marker>
                  )}
                  
                  {formData.latitude && formData.longitude && (
                    <Marker
                      position={[formData.latitude, formData.longitude]}
                      icon={redIcon}
                    >
                      <Popup>Complaint Location</Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </ErrorBoundary>
            
            <div className="mt-4 text-sm text-gray-600 space-y-2">
              <p><strong>Location Selection Methods:</strong></p>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Green marker - Your device location</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span>Red marker - Selected complaint location</span>
              </div>
              <p className="mt-2">💡 <strong>Tip:</strong> Click anywhere on the map to select precise location</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintForm;