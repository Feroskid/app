from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'survey-portal-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24 * 7  # 7 days

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ========================= MODELS =========================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    balance: int = 0
    total_earned: int = 0
    surveys_completed: int = 0
    pending_surveys: int = 0
    created_at: datetime

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class SurveyResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    survey_id: str
    provider: str
    title: str
    description: str
    points: int
    estimated_time: int
    category: str
    difficulty: str
    status: str = "available"

class SurveyCompletionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    completion_id: str
    survey_id: str
    user_id: str
    provider: str
    title: str
    points_earned: int
    completed_at: datetime
    status: str

class WithdrawalRequest(BaseModel):
    amount: int
    method: str  # "paypal", "bank", "crypto"
    account_details: str

class WithdrawalResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    withdrawal_id: str
    user_id: str
    amount: int
    method: str
    account_details: str
    status: str
    created_at: datetime

class LeaderboardEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    rank: int
    user_id: str
    name: str
    picture: Optional[str] = None
    total_earned: int
    surveys_completed: int

class StartSurveyRequest(BaseModel):
    survey_id: str

class CompleteSurveyRequest(BaseModel):
    survey_id: str

# ========================= AUTH HELPERS =========================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_jwt_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    # Then check Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        token = session_token
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a session token (Google OAuth)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    
    # Try JWT token
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ========================= AUTH ENDPOINTS =========================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "picture": None,
        "balance": 0,
        "total_earned": 0,
        "surveys_completed": 0,
        "pending_surveys": 0,
        "created_at": datetime.now(timezone.utc)
    }
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id)
    user_doc.pop("password_hash", None)
    
    return TokenResponse(token=token, user=UserResponse(**user_doc))

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_jwt_token(user["user_id"])
    user.pop("password_hash", None)
    
    return TokenResponse(token=token, user=UserResponse(**user))

@api_router.post("/auth/session")
async def process_google_session(request: Request, response: Response):
    """Process Google OAuth session_id and create session"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Exchange session_id with Emergent Auth
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            auth_data = auth_response.json()
        except Exception as e:
            logger.error(f"Auth error: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    # Find or create user
    user = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if user:
        # Update existing user
        await db.users.update_one(
            {"email": auth_data["email"]},
            {"$set": {"name": auth_data["name"], "picture": auth_data.get("picture")}}
        )
        user["name"] = auth_data["name"]
        user["picture"] = auth_data.get("picture")
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "balance": 0,
            "total_earned": 0,
            "surveys_completed": 0,
            "pending_surveys": 0,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user)
    
    # Store session
    session_token = auth_data.get("session_token", f"sess_{uuid.uuid4().hex}")
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user.pop("password_hash", None)
    return {"user": UserResponse(**user)}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    user.pop("password_hash", None)
    return UserResponse(**user)

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out"}

# ========================= MOCK SURVEY DATA =========================

MOCK_SURVEYS = [
    # Inbrain Surveys
    {"survey_id": "inbrain_001", "provider": "inbrain", "title": "Consumer Shopping Habits", "description": "Share your shopping preferences and habits", "points": 150, "estimated_time": 10, "category": "Shopping", "difficulty": "Easy"},
    {"survey_id": "inbrain_002", "provider": "inbrain", "title": "Technology Usage Survey", "description": "Tell us about your tech devices and usage", "points": 200, "estimated_time": 15, "category": "Technology", "difficulty": "Medium"},
    {"survey_id": "inbrain_003", "provider": "inbrain", "title": "Health & Wellness Check", "description": "Share your health and wellness routines", "points": 300, "estimated_time": 20, "category": "Health", "difficulty": "Medium"},
    {"survey_id": "inbrain_004", "provider": "inbrain", "title": "Entertainment Preferences", "description": "What do you watch, listen to, and play?", "points": 100, "estimated_time": 8, "category": "Entertainment", "difficulty": "Easy"},
    {"survey_id": "inbrain_005", "provider": "inbrain", "title": "Financial Planning Survey", "description": "Your approach to saving and investing", "points": 400, "estimated_time": 25, "category": "Finance", "difficulty": "Hard"},
    # CPX Research Surveys
    {"survey_id": "cpx_001", "provider": "cpx_research", "title": "Social Media Usage", "description": "How do you use social media platforms?", "points": 175, "estimated_time": 12, "category": "Social", "difficulty": "Easy"},
    {"survey_id": "cpx_002", "provider": "cpx_research", "title": "Travel Preferences", "description": "Share your travel experiences and plans", "points": 250, "estimated_time": 18, "category": "Travel", "difficulty": "Medium"},
    {"survey_id": "cpx_003", "provider": "cpx_research", "title": "Food & Dining Habits", "description": "Your restaurant and cooking preferences", "points": 125, "estimated_time": 10, "category": "Food", "difficulty": "Easy"},
    {"survey_id": "cpx_004", "provider": "cpx_research", "title": "Automotive Survey", "description": "Your vehicle preferences and habits", "points": 350, "estimated_time": 22, "category": "Automotive", "difficulty": "Hard"},
    {"survey_id": "cpx_005", "provider": "cpx_research", "title": "Home Improvement", "description": "DIY projects and home renovation plans", "points": 275, "estimated_time": 16, "category": "Home", "difficulty": "Medium"},
]

# ========================= SURVEY ENDPOINTS =========================

@api_router.get("/surveys", response_model=List[SurveyResponse])
async def get_available_surveys(
    provider: Optional[str] = None,
    category: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get available surveys (mocked from Inbrain & CPX Research)"""
    # Get user's completed surveys
    completed = await db.survey_completions.find(
        {"user_id": user["user_id"]}, {"survey_id": 1, "_id": 0}
    ).to_list(1000)
    completed_ids = {c["survey_id"] for c in completed}
    
    # Get user's pending surveys
    pending = await db.pending_surveys.find(
        {"user_id": user["user_id"]}, {"survey_id": 1, "_id": 0}
    ).to_list(100)
    pending_ids = {p["survey_id"] for p in pending}
    
    surveys = []
    for s in MOCK_SURVEYS:
        if s["survey_id"] in completed_ids:
            continue
        if provider and s["provider"] != provider:
            continue
        if category and s["category"] != category:
            continue
        
        status = "in_progress" if s["survey_id"] in pending_ids else "available"
        surveys.append(SurveyResponse(**s, status=status))
    
    return surveys

@api_router.post("/surveys/start", response_model=SurveyResponse)
async def start_survey(data: StartSurveyRequest, user: dict = Depends(get_current_user)):
    """Start a survey (mark as in-progress)"""
    survey = next((s for s in MOCK_SURVEYS if s["survey_id"] == data.survey_id), None)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    # Check if already completed
    completed = await db.survey_completions.find_one(
        {"user_id": user["user_id"], "survey_id": data.survey_id}, {"_id": 0}
    )
    if completed:
        raise HTTPException(status_code=400, detail="Survey already completed")
    
    # Check if already in progress
    pending = await db.pending_surveys.find_one(
        {"user_id": user["user_id"], "survey_id": data.survey_id}, {"_id": 0}
    )
    if not pending:
        await db.pending_surveys.insert_one({
            "user_id": user["user_id"],
            "survey_id": data.survey_id,
            "started_at": datetime.now(timezone.utc)
        })
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"pending_surveys": 1}}
        )
    
    return SurveyResponse(**survey, status="in_progress")

@api_router.post("/surveys/complete", response_model=SurveyCompletionResponse)
async def complete_survey(data: CompleteSurveyRequest, user: dict = Depends(get_current_user)):
    """Complete a survey and earn points (auto-updates balance)"""
    survey = next((s for s in MOCK_SURVEYS if s["survey_id"] == data.survey_id), None)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    # Check if already completed
    existing = await db.survey_completions.find_one(
        {"user_id": user["user_id"], "survey_id": data.survey_id}, {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Survey already completed")
    
    completion_id = f"comp_{uuid.uuid4().hex[:12]}"
    completion = {
        "completion_id": completion_id,
        "survey_id": survey["survey_id"],
        "user_id": user["user_id"],
        "provider": survey["provider"],
        "title": survey["title"],
        "points_earned": survey["points"],
        "completed_at": datetime.now(timezone.utc),
        "status": "completed"
    }
    await db.survey_completions.insert_one(completion)
    
    # Remove from pending
    await db.pending_surveys.delete_one({"user_id": user["user_id"], "survey_id": data.survey_id})
    
    # AUTO-UPDATE USER BALANCE
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$inc": {
                "balance": survey["points"],
                "total_earned": survey["points"],
                "surveys_completed": 1,
                "pending_surveys": -1
            }
        }
    )
    
    logger.info(f"User {user['user_id']} completed survey {survey['survey_id']} and earned {survey['points']} points")
    
    return SurveyCompletionResponse(**completion)

@api_router.get("/surveys/history", response_model=List[SurveyCompletionResponse])
async def get_survey_history(user: dict = Depends(get_current_user)):
    """Get user's completed surveys"""
    completions = await db.survey_completions.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("completed_at", -1).to_list(100)
    
    for c in completions:
        if isinstance(c.get("completed_at"), str):
            c["completed_at"] = datetime.fromisoformat(c["completed_at"])
    
    return [SurveyCompletionResponse(**c) for c in completions]

# ========================= WALLET & WITHDRAWAL =========================

@api_router.get("/wallet")
async def get_wallet(user: dict = Depends(get_current_user)):
    """Get user's wallet info"""
    withdrawals = await db.withdrawals.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    
    for w in withdrawals:
        if isinstance(w.get("created_at"), str):
            w["created_at"] = datetime.fromisoformat(w["created_at"])
    
    return {
        "balance": user.get("balance", 0),
        "total_earned": user.get("total_earned", 0),
        "pending_withdrawals": sum(w["amount"] for w in withdrawals if w["status"] == "pending"),
        "recent_withdrawals": withdrawals
    }

@api_router.post("/withdrawals", response_model=WithdrawalResponse)
async def request_withdrawal(data: WithdrawalRequest, user: dict = Depends(get_current_user)):
    """Request a withdrawal"""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if data.amount > user.get("balance", 0):
        raise HTTPException(status_code=400, detail="Insufficient balance")
    if data.amount < 500:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is 500 points")
    
    withdrawal_id = f"wd_{uuid.uuid4().hex[:12]}"
    withdrawal = {
        "withdrawal_id": withdrawal_id,
        "user_id": user["user_id"],
        "amount": data.amount,
        "method": data.method,
        "account_details": data.account_details,
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    await db.withdrawals.insert_one(withdrawal)
    
    # Deduct from balance
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"balance": -data.amount}}
    )
    
    return WithdrawalResponse(**withdrawal)

@api_router.get("/withdrawals", response_model=List[WithdrawalResponse])
async def get_withdrawals(user: dict = Depends(get_current_user)):
    """Get user's withdrawal history"""
    withdrawals = await db.withdrawals.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    for w in withdrawals:
        if isinstance(w.get("created_at"), str):
            w["created_at"] = datetime.fromisoformat(w["created_at"])
    
    return [WithdrawalResponse(**w) for w in withdrawals]

# ========================= LEADERBOARD =========================

@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard():
    """Get top earners leaderboard"""
    users = await db.users.find(
        {}, {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "total_earned": 1, "surveys_completed": 1}
    ).sort("total_earned", -1).limit(20).to_list(20)
    
    leaderboard = []
    for i, u in enumerate(users):
        leaderboard.append(LeaderboardEntry(
            rank=i + 1,
            user_id=u["user_id"],
            name=u.get("name", "Anonymous"),
            picture=u.get("picture"),
            total_earned=u.get("total_earned", 0),
            surveys_completed=u.get("surveys_completed", 0)
        ))
    
    return leaderboard

# ========================= STATS =========================

@api_router.get("/stats")
async def get_user_stats(user: dict = Depends(get_current_user)):
    """Get user dashboard stats"""
    # Get recent completions
    recent = await db.survey_completions.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("completed_at", -1).limit(5).to_list(5)
    
    for r in recent:
        if isinstance(r.get("completed_at"), str):
            r["completed_at"] = datetime.fromisoformat(r["completed_at"])
    
    return {
        "balance": user.get("balance", 0),
        "total_earned": user.get("total_earned", 0),
        "surveys_completed": user.get("surveys_completed", 0),
        "pending_surveys": user.get("pending_surveys", 0),
        "recent_completions": recent
    }

# ========================= ROOT =========================

@api_router.get("/")
async def root():
    return {"message": "Survey Portal API", "version": "1.0.0"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
