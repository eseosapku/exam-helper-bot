from flask import Flask, request, jsonify, render_template, send_file
from flask_cors import CORS
import os
from dotenv import load_dotenv
from pymongo import MongoClient
import stripe
import json
from datetime import datetime, timedelta
import jwt
import uuid
from werkzeug.security import generate_password_hash, check_password_hash

from scraper import ExamPaperScraper
from qa_system import QuestionAnswering

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize database connection
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(mongo_uri)
db = client['exam_helper']

# Initialize components
scraper = ExamPaperScraper(mongo_uri)
qa_system = QuestionAnswering(mongo_uri)

# Set up Stripe
stripe.api_key = os.getenv("STRIPE_API_KEY")

# Authentication
def generate_token(user_id):
    """Generate JWT token for authentication"""
    payload = {
        'exp': datetime.utcnow() + timedelta(days=30),
        'iat': datetime.utcnow(),
        'sub': user_id
    }
    return jwt.encode(
        payload,
        os.getenv("JWT_SECRET_KEY"),
        algorithm='HS256'
    )

def validate_token(token):
    """Validate JWT token"""
    try:
        payload = jwt.decode(
            token,
            os.getenv("JWT_SECRET_KEY"),
            algorithms=['HS256']
        )
        return payload['sub']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# Authentication middleware
def authenticate(func):
    def wrapper(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = validate_token(token)
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401
            
        # Check if subscription is active
        user = db.users.find_one({"_id": user_id})
        if not user or user.get("subscription_status") != "active":
            return jsonify({"error": "Subscription required"}), 403
            
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    # Check if user already exists
    if db.users.find_one({"email": email}):
        return jsonify({"error": "User already exists"}), 400
    
    # Hash the password before storing it
    hashed_password = generate_password_hash(password)
    
    # Create new user
    user_id = str(uuid.uuid4())
    db.users.insert_one({
        "_id": user_id,
        "email": email,
        "password": hashed_password,
        "created_at": datetime.utcnow(),
        "subscription_status": "inactive"
    })
    
    # Generate token
    token = generate_token(user_id)
    
    return jsonify({"token": token, "user_id": user_id})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    # Find user
    user = db.users.find_one({"email": email})
    if not user or not check_password_hash(user['password'], password):
        return jsonify({"error": "Invalid credentials"}), 401
    
    # Generate token
    token = generate_token(user["_id"])
    
    return jsonify({"token": token, "user_id": user["_id"], "subscription_status": user.get("subscription_status")})

# Other routes remain the same...
