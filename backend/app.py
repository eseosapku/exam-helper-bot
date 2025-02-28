# app.py
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
    password = data.get('password')  # In production, hash this password
    
    # Check if user already exists
    if db.users.find_one({"email": email}):
        return jsonify({"error": "User already exists"}), 400
    
    # Create new user
    user_id = str(uuid.uuid4())
    db.users.insert_one({
        "_id": user_id,
        "email": email,
        "password": password,  # Should be hashed
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
    user = db.users.find_one({"email": email, "password": password})
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    
    # Generate token
    token = generate_token(user["_id"])
    
    return jsonify({"token": token, "user_id": user["_id"], "subscription_status": user.get("subscription_status")})

@app.route('/api/create-checkout-session', methods=['POST'])
def create_checkout_session():
    data = request.json
    user_id = data.get('user_id')
    
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[
                {
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': 'Exam Helper Premium Subscription',
                        },
                        'unit_amount': 5000,  # $50.00
                        'recurring': {
                            'interval': 'month',
                        },
                    },
                    'quantity': 1,
                },
            ],
            mode='subscription',
            success_url=f"{request.host_url}payment-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{request.host_url}payment-cancel",
            client_reference_id=user_id,
        )
        
        return jsonify({'id': checkout_session.id})
    except Exception as e:
        return jsonify(error=str(e)), 400

@app.route('/api/payment-webhook', methods=['POST'])
def payment_webhook():
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv('STRIPE_WEBHOOK_SECRET')
        )
    except ValueError as e:
        return jsonify({"error": "Invalid payload"}), 400
    except stripe.error.SignatureVerificationError as e:
        return jsonify({"error": "Invalid signature"}), 400
    
    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get('client_reference_id')
        
        # Update user subscription
        db.users.update_one(
            {"_id": user_id},
            {"$set": {"subscription_status": "active"}}
        )
    
    return jsonify({"status": "success"})

@app.route('/api/ask', methods=['POST'])
@authenticate
def ask_question():
    data = request.json
    question = data.get('question')
    
    # Search for similar questions
    matches = qa_system.search_question(question)
    
    if matches:
        return jsonify({
            "matches": matches,
            "message": "I found some similar questions in our database."
        })
    else:
        # Try to answer directly
        answer = qa_system.ask_custom_question(question)
        return jsonify({
            "answer": answer,
            "message": "I couldn't find an exact match, but here's my best answer:"
        })

@app.route('/api/answer/<paper_id>/<question_number>', methods=['GET'])
@authenticate
def get_answer(paper_id, question_number):
    answer = qa_system.get_answer(paper_id, question_number)
    return jsonify({"answer": answer})

@app.route('/api/download/<paper_id>', methods=['GET'])
@authenticate
def download_paper(paper_id):
    # Find paper in downloads folder
    paper_path = f"downloads/{paper_id}"
    if os.path.exists(paper_path):
        return send_file(paper_path, as_attachment=True)
    else:
        return jsonify({"error": "Paper not found"}), 404

if __name__ == '__main__':
    app.run(debug=True)