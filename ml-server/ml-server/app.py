from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import joblib
import numpy as np
import re
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

PORT = int(os.environ.get("PORT", 5000))
DEBUG = os.environ.get("FLASK_ENV") != "production"
# Load your trained model
MODEL_PATH = os.environ.get(
    "MODEL_PATH",
    "text_model.joblib"
)

if not os.path.exists(MODEL_PATH):
    MODEL_PATH = "comprehensive_model.joblib"

try:
    model = joblib.load(MODEL_PATH)
    print(f"Loaded model: {MODEL_PATH}")

except Exception as e:
    print(e)
    model = None

# Hazard type mapping (adjust based on your model's output)
HAZARD_TYPES = {
    0: "Potholes",
    1: "Electrical Hazards", 
    2: "Water Supply",
    3: "Sewage & Drainage",
    4: "Road Damage",
    5: "Street Lights",
    6: "Garbage Collection",
    7: "Public Safety",
    8: "Noise Pollution",
    9: "Illegal Construction",
    10: "Other"
}

# Severity mapping (adjust based on your model's output)
SEVERITY_LEVELS = {
    0: "low",
    1: "medium", 
    2: "high",
    3: "critical"
}

def preprocess_text(text):
    """Preprocess the complaint description text"""
    if not text:
        return ""
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove special characters and extra spaces
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

@app.route('/')
def home():
    return jsonify({
        "message": "Complaint Classification API",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/predict', methods=['POST'])
def predict_complaint():
    try:
        data = request.get_json()
        
        if not data or 'description' not in data:
            return jsonify({
                "error": "Missing 'description' in request body"
            }), 400
        
        description = data['description']
        
        if not description or len(description.strip()) == 0:
            return jsonify({
                "error": "Description cannot be empty"
            }), 400
        
        # Preprocess the text
        processed_text = preprocess_text(description)
        
        if model is None:
            return jsonify({
                "error": "Model not loaded properly"
            }), 500
        
        # Make prediction (adjust this based on your model's predict method)
        # This assumes your model returns (hazard_type, severity) or similar
        try:
            prediction = model.predict([processed_text])
            
            # Adjust this part based on your model's output format
            if isinstance(prediction, np.ndarray):
                prediction = prediction.tolist()
            
            # If model returns multiple outputs (type and severity)
            if isinstance(prediction[0], (list, np.ndarray)):
                hazard_pred = prediction[0][0] if len(prediction[0]) > 0 else prediction[0]
                severity_pred = prediction[0][1] if len(prediction[0]) > 1 else 1
            else:
                # Single output - adjust based on your model
                hazard_pred = prediction[0]
                severity_pred = 1  # Default medium severity
            
            # Map numerical predictions to labels
            hazard_type = HAZARD_TYPES.get(int(hazard_pred), "Other")
            severity = SEVERITY_LEVELS.get(int(severity_pred), "medium")
            
            # Calculate confidence scores (if your model supports it)
            confidence = 0.85  # Default or calculate from model
            
            return jsonify({
                "hazard_type": hazard_type,
                "severity": severity,
                "confidence": round(confidence, 2),
                "processed_text": processed_text,
                "original_text": description
            })
            
        except Exception as model_error:
            print(f"Model prediction error: {model_error}")
            return jsonify({
                "error": f"Prediction failed: {str(model_error)}"
            }), 500
            
    except Exception as e:
        print(f"Server error: {e}")
        return jsonify({
            "error": f"Internal server error: {str(e)}"
        }), 500

@app.route('/health')
def health_check():
    return jsonify({
        "status": "healthy" if model else "degraded",
        "model_loaded": model is not None,
        "timestamp": datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(debug=DEBUG, host='0.0.0.0', port=PORT)