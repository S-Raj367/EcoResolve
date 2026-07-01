from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import joblib
import numpy as np
import re
import traceback
import logging
import os

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Global variables
model_data = None
model_loaded = False

def load_model():
    """Load the comprehensive model with both category and severity classifiers"""
    global model_data, model_loaded
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    MODEL_PATH = os.environ.get(
        "MODEL_PATH",
        os.path.join(BASE_DIR, "comprehensive_model.joblib")
    )

    model_path = MODEL_PATH
    
    if not os.path.exists(model_path):
        logger.error(f"❌ Model file not found: {model_path}")
        return False
    
    try:
        logger.info("🔄 Loading comprehensive model...")
        model_data = joblib.load(model_path)
        
        # Check if all required components are present
        required_components = ['category_pipeline', 'severity_pipeline', 'label_encoder', 'severity_encoder']
        missing_components = [comp for comp in required_components if comp not in model_data]
        
        if missing_components:
            logger.error(f"❌ Missing components: {missing_components}")
            return False
        
        model_loaded = True
        logger.info("✅ Comprehensive model loaded successfully!")
        logger.info(f"   - Category classes: {list(model_data['label_encoder'].classes_)}")
        logger.info(f"   - Severity levels: {list(model_data['severity_encoder'].classes_)}")
        
        # Test the model
        test_text = "pothole on road"
        category_pred = model_data['category_pipeline'].predict([test_text])[0]
        severity_pred = model_data['severity_pipeline'].predict([test_text])[0]
        
        category_name = model_data['label_encoder'].inverse_transform([category_pred])[0]
        severity_name = model_data['severity_encoder'].inverse_transform([severity_pred])[0]
        
        logger.info(f"🧪 Model test - '{test_text}' -> {category_name} ({severity_name})")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error loading model: {e}")
        logger.error(traceback.format_exc())
        return False

def preprocess_text(text):
    """Preprocess the complaint description text"""
    if not text:
        return ""
    
    text = text.lower()
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

class MLComplaintHandler(BaseHTTPRequestHandler):
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        try:
            if self.path == '/health':
                response = {
                    "status": "healthy" if model_loaded else "degraded",
                    "model_loaded": model_loaded,
                    "message": "ML Complaint Classification API",
                    "using_ml_model": model_loaded,
                    "category_classes": list(model_data['label_encoder'].classes_) if model_loaded else None,
                    "severity_levels": list(model_data['severity_encoder'].classes_) if model_loaded else None
                }
                self.send_success_response(response)
            else:
                self.send_response(404)
                self.end_headers()
                
        except Exception as e:
            logger.error(f"GET request error: {e}")
            self.send_error_response(500, f"Server error: {str(e)}")
    
    def do_POST(self):
        """Handle POST requests - Uses actual trained ML model"""
        try:
            if self.path == '/predict':
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length == 0:
                    self.send_error_response(400, "Empty request body")
                    return
                
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                description = data.get('description', '')
                
                logger.info(f"Processing description: {description[:100]}...")
                
                # Validate input
                if not description:
                    self.send_error_response(400, "Description is required")
                    return
                
                if len(description.strip()) < 5:
                    self.send_error_response(400, "Description too short (min 5 characters)")
                    return
                
                # Preprocess text
                processed_text = preprocess_text(description)
                
                # Make prediction using ACTUAL ML model
                if model_loaded:
                    result = self.ml_prediction(processed_text, description)
                else:
                    result = self.fallback_prediction(description)
                
                logger.info(f"✅ Prediction result: {result['hazard_type']} ({result['severity']})")
                self.send_success_response(result)
                
            else:
                self.send_response(404)
                self.end_headers()
                
        except Exception as e:
            logger.error(f"POST request error: {e}")
            logger.error(traceback.format_exc())
            self.send_error_response(500, f"Internal server error: {str(e)}")
    
    def ml_prediction(self, processed_text, original_text):
        """Make prediction using the trained ML model"""
        try:
            logger.info("🤖 Using trained ML model for prediction...")
            
            # Get category prediction
            category_pred = model_data['category_pipeline'].predict([processed_text])[0]
            category_name = model_data['label_encoder'].inverse_transform([category_pred])[0]
            
            # Get severity prediction
            severity_pred = model_data['severity_pipeline'].predict([processed_text])[0]
            severity_name = model_data['severity_encoder'].inverse_transform([severity_pred])[0]
            
            # Get confidence scores
            category_proba = model_data['category_pipeline'].predict_proba([processed_text])[0]
            severity_proba = model_data['severity_pipeline'].predict_proba([processed_text])[0]
            
            category_confidence = float(np.max(category_proba))
            severity_confidence = float(np.max(severity_proba))
            overall_confidence = (category_confidence + severity_confidence) / 2
            
            # Convert category names to match your frontend
            hazard_type = self.map_category_to_frontend(category_name)
            
            return {
                "hazard_type": hazard_type,
                "severity": severity_name,
                "confidence": round(overall_confidence, 2),
                "category_confidence": round(category_confidence, 2),
                "severity_confidence": round(severity_confidence, 2),
                "original_category": category_name,
                "success": True,
                "method": "ml_model"
            }
            
        except Exception as e:
            logger.error(f"ML prediction failed: {e}")
            logger.error(traceback.format_exc())
            return self.fallback_prediction(original_text)
    
    def map_category_to_frontend(self, category_name):
        """Map your model's category names to frontend hazard types"""
        category_mapping = {
            'road_damage': 'Potholes',
            'safety_hazard': 'Electrical Hazards', 
            'sanitation': 'Garbage Collection',
            'water_issue': 'Water Supply',
            'sewage': 'Sewage & Drainage',
            'street_lights': 'Street Lights',
            'noise': 'Noise Pollution',
            'construction': 'Illegal Construction',
            'public_safety': 'Public Safety',
            'other': 'Other'
            # Add any other categories that exist in your dataset
        }
        
        return category_mapping.get(category_name, 'Other')
    
    def fallback_prediction(self, description):
        """Fallback prediction if ML model fails"""
        logger.info("⚠️ Using fallback keyword prediction")
        description_lower = description.lower()
        
        hazard_keywords = {
            "pothole": "Potholes",
            "road damage": "Road Damage",
            "road broken": "Road Damage",
            "electrical": "Electrical Hazards",
            "electric": "Electrical Hazards",
            "wire": "Electrical Hazards",
            "water": "Water Supply",
            "sewage": "Sewage & Drainage",
            "drain": "Sewage & Drainage",
            "garbage": "Garbage Collection",
            "trash": "Garbage Collection"
        }
        
        severity_keywords = {
            "critical": "critical",
            "emergency": "critical", 
            "urgent": "high",
            "danger": "high",
            "dangerous": "high"
        }
        
        detected_hazard = "Other"
        detected_severity = "medium"
        
        for keyword, hazard in hazard_keywords.items():
            if keyword in description_lower:
                detected_hazard = hazard
                break
        
        for keyword, severity in severity_keywords.items():
            if keyword in description_lower:
                detected_severity = severity
                break
        
        return {
            "hazard_type": detected_hazard,
            "severity": detected_severity,
            "confidence": 0.65,
            "success": True,
            "method": "keyword_fallback"
        }
    
    def send_success_response(self, data):
        """Send successful response"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def send_error_response(self, code, message):
        """Send error response"""
        self.send_response(code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = {
            "error": message,
            "success": False
        }
        self.wfile.write(json.dumps(response).encode())

def run_server(port=int(os.environ.get("PORT", 5000))):
    """Start the HTTP server"""
    logger.info("🚀 Starting ML Complaint Classification Server...")
    
    # Load the comprehensive model
    if not load_model():
        logger.warning("⚠️  Model not loaded properly. Server will use fallback mode.")
    
    server_address = ('', port)
    httpd = HTTPServer(server_address, MLComplaintHandler)
    
    logger.info(f"🌐 Server running on http://localhost:{port}")
    logger.info(f"❤️ Health check: http://localhost:{port}/health")
    logger.info( f"POST http://localhost:{port}/predict")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("🛑 Server stopped by user")
    except Exception as e:
        logger.error(f"🛑 Server crashed: {e}")
    finally:
        httpd.server_close()

if __name__ == '__main__':
    run_server()