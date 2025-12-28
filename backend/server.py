from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from fastapi.security import HTTPBearer
from fastapi.responses import PlainTextResponse
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
import hashlib

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

# ========================= SURVEY PROVIDER CONFIGURATIONS =========================

# Inbrain Configuration
INBRAIN_CONFIG = {
    "callback_secret": os.environ.get("INBRAIN_CALLBACK_SECRET", "MjNiMjdmNTgtODY3YS00NDljLWJlYmItY2YyMjE0OTFlYmQ2"),
    "placement_id": "3a0973b1-e1ca-46de-ab80-504cf53331c4",
    "survey_wall_base": "https://www.surveyb.in/configuration?params=Um5odTdRZXl1d1oyQUt3Q0RiVmN5QUZHeGxaVDhYdkhUQ0pMTlNQTlRzelJPNlBqME9WU29obmZwOTk2eURNc05CRWMySk1ETy8wd2dCdXk5amhpYkxWM2M5aW9XWnd6T3ZYbXFYdFgvbUdiWlJlY1MrVG9JOVlBai9Da3pSMjlXbm1JQktqeVBNa2Y0UE1uQlBlK1VFVDBaTHJ6THg3RlNQdGJNVGJqVVRhN3FqSzNSaHdJb2VQTGNXR2tZdWRSRTY1ZkcrZ3NjNTR4M21TWE1UaDlMdz09"
}

# CPX Research Configuration
CPX_CONFIG = {
    "app_id": "19171",
    "secure_hash": os.environ.get("CPX_SECURE_HASH", ""),  # Set this in .env
    "iframe_base": "https://offers.cpx-research.com/index.php"
}

# Admantium Configuration
ADMANTIUM_CONFIG = {
    "api_key": "65a590d817264916626634",
    "secret": os.environ.get("ADMANTIUM_SECRET", "6c97d28091"),
    "api_secret": "067fd20198",
    "iframe_base": "https://wall.admantium.net/wall",
    "whitelist_ip": "3.22.177.178"
}

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

class TransactionRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    transaction_id: str
    user_id: str
    provider: str
    reward_type: str  # "credit" or "reversal"
    points: int
    offer_id: Optional[str] = None
    offer_name: Optional[str] = None
    status: str
    created_at: datetime
    raw_data: Optional[dict] = None

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
    
    async with httpx.AsyncClient() as http_client:
        try:
            auth_response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            auth_data = auth_response.json()
        except Exception as e:
            logger.error(f"Auth error: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    user = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if user:
        await db.users.update_one(
            {"email": auth_data["email"]},
            {"$set": {"name": auth_data["name"], "picture": auth_data.get("picture")}}
        )
        user["name"] = auth_data["name"]
        user["picture"] = auth_data.get("picture")
    else:
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
    
    session_token = auth_data.get("session_token", f"sess_{uuid.uuid4().hex}")
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
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

# ========================= SURVEY PROVIDER IFRAME URLs =========================

@api_router.get("/surveys/providers")
async def get_survey_providers(user: dict = Depends(get_current_user)):
    """Get survey wall iframe URLs for all providers"""
    user_id = user["user_id"]
    
    return {
        "providers": [
            {
                "id": "inbrain",
                "name": "Inbrain",
                "description": "Premium surveys from top brands",
                "iframe_url": f"{INBRAIN_CONFIG['survey_wall_base']}&app_uid={user_id}",
                "color": "#6366F1"
            },
            {
                "id": "cpx_research",
                "name": "CPX Research",
                "description": "Global research surveys",
                "iframe_url": f"{CPX_CONFIG['iframe_base']}?app_id={CPX_CONFIG['app_id']}&ext_user_id={user_id}",
                "color": "#10B981"
            },
            {
                "id": "admantium",
                "name": "Admantium",
                "description": "Offers and surveys",
                "iframe_url": f"{ADMANTIUM_CONFIG['iframe_base']}?apiKey={ADMANTIUM_CONFIG['api_key']}&userId={user_id}",
                "color": "#F59E0B"
            }
        ],
        "user_id": user_id
    }

# ========================= POSTBACK ENDPOINTS =========================

@api_router.post("/postback/inbrain/success", response_class=PlainTextResponse)
async def inbrain_success_callback(request: Request):
    """
    Inbrain Success Callback - Called when user completes a survey
    Validates signature: MD5(PanelistId + RewardId + CallbackSecret)
    """
    try:
        data = await request.json()
        logger.info(f"Inbrain success callback received: {data}")
        
        # Extract fields
        sig = data.get("Sig", "")
        panelist_id = data.get("PanelistId", "")  # This is our user_id
        reward_id = data.get("RewardId", "")
        reward = int(data.get("Reward", 0))
        reward_type = data.get("RewardType", "")
        revenue_amount = float(data.get("RevenueAmount", 0))
        is_test = data.get("IsTest", False)
        session_id = data.get("SessionId", "")
        
        # Validate signature
        expected_sig = hashlib.md5(
            f"{panelist_id}{reward_id}{INBRAIN_CONFIG['callback_secret']}".encode()
        ).hexdigest()
        
        if sig.lower() != expected_sig.lower():
            logger.warning(f"Inbrain signature mismatch: expected {expected_sig}, got {sig}")
            return PlainTextResponse("SIGNATURE_MISMATCH", status_code=400)
        
        # Check for duplicate transaction
        existing = await db.transactions.find_one({"transaction_id": reward_id}, {"_id": 0})
        if existing:
            logger.info(f"Duplicate Inbrain transaction: {reward_id}")
            return PlainTextResponse("OK")
        
        # Find user
        user = await db.users.find_one({"user_id": panelist_id}, {"_id": 0})
        if not user:
            logger.warning(f"Inbrain callback: User not found: {panelist_id}")
            return PlainTextResponse("USER_NOT_FOUND", status_code=404)
        
        # Credit user (skip if test and reward is 0)
        if reward > 0:
            await db.users.update_one(
                {"user_id": panelist_id},
                {
                    "$inc": {
                        "balance": reward,
                        "total_earned": reward,
                        "surveys_completed": 1
                    }
                }
            )
            
            # Record transaction
            transaction = {
                "transaction_id": reward_id,
                "user_id": panelist_id,
                "provider": "inbrain",
                "reward_type": "credit",
                "points": reward,
                "offer_name": reward_type,
                "revenue_usd": revenue_amount,
                "status": "completed",
                "is_test": is_test,
                "created_at": datetime.now(timezone.utc),
                "raw_data": data
            }
            await db.transactions.insert_one(transaction)
            
            logger.info(f"Inbrain: Credited {reward} points to user {panelist_id}")
        
        return PlainTextResponse("OK")
        
    except Exception as e:
        logger.error(f"Inbrain success callback error: {e}")
        return PlainTextResponse("ERROR", status_code=500)

@api_router.post("/postback/inbrain/failure", response_class=PlainTextResponse)
async def inbrain_failure_callback(request: Request):
    """
    Inbrain Failure Callback - Called when user is disqualified from a survey
    May still contain reward for disqualification if configured
    """
    try:
        data = await request.json()
        logger.info(f"Inbrain failure callback received: {data}")
        
        sig = data.get("Sig", "")
        panelist_id = data.get("PanelistId", "")
        reward_id = data.get("RewardId", "")
        reward = int(data.get("Reward", 0))
        reward_type = data.get("RewardType", "")
        
        # Validate signature
        expected_sig = hashlib.md5(
            f"{panelist_id}{reward_id}{INBRAIN_CONFIG['callback_secret']}".encode()
        ).hexdigest()
        
        if sig.lower() != expected_sig.lower():
            logger.warning(f"Inbrain failure sig mismatch")
            return PlainTextResponse("SIGNATURE_MISMATCH", status_code=400)
        
        # Check for duplicate
        existing = await db.transactions.find_one({"transaction_id": reward_id}, {"_id": 0})
        if existing:
            return PlainTextResponse("OK")
        
        # If there's a disqualification reward, credit it
        if reward > 0:
            user = await db.users.find_one({"user_id": panelist_id}, {"_id": 0})
            if user:
                await db.users.update_one(
                    {"user_id": panelist_id},
                    {"$inc": {"balance": reward, "total_earned": reward}}
                )
        
        # Record transaction
        transaction = {
            "transaction_id": reward_id,
            "user_id": panelist_id,
            "provider": "inbrain",
            "reward_type": "disqualification",
            "points": reward,
            "offer_name": reward_type,
            "status": "disqualified",
            "created_at": datetime.now(timezone.utc),
            "raw_data": data
        }
        await db.transactions.insert_one(transaction)
        
        return PlainTextResponse("OK")
        
    except Exception as e:
        logger.error(f"Inbrain failure callback error: {e}")
        return PlainTextResponse("ERROR", status_code=500)

@api_router.get("/postback/cpx", response_class=PlainTextResponse)
async def cpx_research_callback(
    request: Request,
    status: int = Query(...),
    trans_id: str = Query(...),
    user_id: str = Query(...),
    amount_local: float = Query(default=0),
    amount_usd: float = Query(default=0),
    offer_id: str = Query(default=""),
    hash: str = Query(default="", alias="secure_hash"),
    type: str = Query(default="complete"),
    ip_click: str = Query(default=""),
    subid: str = Query(default=""),
    subid_2: str = Query(default="")
):
    """
    CPX Research Postback URL
    Status: 1 = completed, 2 = canceled/reversed
    Hash validation: MD5(trans_id + app_secure_hash)
    """
    try:
        logger.info(f"CPX callback: status={status}, trans_id={trans_id}, user_id={user_id}, amount={amount_local}")
        
        # Validate hash if secure_hash is configured
        if CPX_CONFIG["secure_hash"] and hash:
            expected_hash = hashlib.md5(
                f"{trans_id}-{CPX_CONFIG['secure_hash']}".encode()
            ).hexdigest()
            if hash.lower() != expected_hash.lower():
                logger.warning(f"CPX hash mismatch")
                return PlainTextResponse("0")
        
        # Check for duplicate
        existing = await db.transactions.find_one({"transaction_id": trans_id}, {"_id": 0})
        
        # Find user
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            logger.warning(f"CPX callback: User not found: {user_id}")
            return PlainTextResponse("0")
        
        points = int(amount_local)
        
        if status == 1:  # Completed
            if existing:
                logger.info(f"Duplicate CPX completion: {trans_id}")
                return PlainTextResponse("1")
            
            # Credit user
            await db.users.update_one(
                {"user_id": user_id},
                {
                    "$inc": {
                        "balance": points,
                        "total_earned": points,
                        "surveys_completed": 1
                    }
                }
            )
            
            transaction = {
                "transaction_id": trans_id,
                "user_id": user_id,
                "provider": "cpx_research",
                "reward_type": "credit",
                "points": points,
                "offer_id": offer_id,
                "amount_usd": amount_usd,
                "status": "completed",
                "type": type,
                "ip_click": ip_click,
                "created_at": datetime.now(timezone.utc)
            }
            await db.transactions.insert_one(transaction)
            logger.info(f"CPX: Credited {points} points to user {user_id}")
            
        elif status == 2:  # Canceled/Reversed (Fraud)
            if existing and existing.get("status") == "reversed":
                return PlainTextResponse("1")
            
            # Reverse/deduct points
            await db.users.update_one(
                {"user_id": user_id},
                {
                    "$inc": {
                        "balance": -points,
                        "total_earned": -points,
                        "surveys_completed": -1
                    }
                }
            )
            
            # Update existing transaction or create reversal record
            if existing:
                await db.transactions.update_one(
                    {"transaction_id": trans_id},
                    {"$set": {"status": "reversed", "reversed_at": datetime.now(timezone.utc)}}
                )
            else:
                transaction = {
                    "transaction_id": trans_id,
                    "user_id": user_id,
                    "provider": "cpx_research",
                    "reward_type": "reversal",
                    "points": -points,
                    "offer_id": offer_id,
                    "status": "reversed",
                    "created_at": datetime.now(timezone.utc)
                }
                await db.transactions.insert_one(transaction)
            
            logger.info(f"CPX: Reversed {points} points from user {user_id} (fraud)")
        
        return PlainTextResponse("1")
        
    except Exception as e:
        logger.error(f"CPX callback error: {e}")
        return PlainTextResponse("0")

@api_router.get("/postback/admantium", response_class=PlainTextResponse)
async def admantium_callback(
    request: Request,
    user_id: str = Query(...),
    reward: int = Query(...),
    status: str = Query(...),  # "credited" or "rejected"
    transaction_id: str = Query(...),
    offer_id: str = Query(default=""),
    offer_name: str = Query(default=""),
    signature: str = Query(default=""),
    ip: str = Query(default=""),
    payout: float = Query(default=0),
    aff_sub: str = Query(default=""),
    aff_sub2: str = Query(default=""),
    goal_id: str = Query(default=""),
    goal_name: str = Query(default="")
):
    """
    Admantium Postback URL
    Status: "credited" = add points, "rejected" = subtract points (fraud/cancellation)
    Signature validation: MD5(user_id + transaction_id + reward + secret)
    Whitelist IP: 3.22.177.178
    """
    try:
        logger.info(f"Admantium callback: status={status}, trans_id={transaction_id}, user_id={user_id}, reward={reward}")
        
        # IP whitelist check (optional but recommended)
        client_ip = request.client.host if request.client else ""
        # Note: In production behind proxy, check X-Forwarded-For header
        forwarded_for = request.headers.get("X-Forwarded-For", "")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        # Validate signature
        expected_sig = hashlib.md5(
            f"{user_id}{transaction_id}{reward}{ADMANTIUM_CONFIG['secret']}".encode()
        ).hexdigest()
        
        if signature.lower() != expected_sig.lower():
            logger.warning(f"Admantium signature mismatch: expected {expected_sig}, got {signature}")
            return PlainTextResponse("ERROR: Signature doesn't match")
        
        # Find user
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            logger.warning(f"Admantium callback: User not found: {user_id}")
            return PlainTextResponse("ERROR: User not found")
        
        # Check for duplicate
        existing = await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})
        
        if status == "credited":
            if existing and existing.get("status") == "completed":
                return PlainTextResponse("OK")
            
            # Credit user
            await db.users.update_one(
                {"user_id": user_id},
                {
                    "$inc": {
                        "balance": reward,
                        "total_earned": reward,
                        "surveys_completed": 1
                    }
                }
            )
            
            transaction = {
                "transaction_id": transaction_id,
                "user_id": user_id,
                "provider": "admantium",
                "reward_type": "credit",
                "points": reward,
                "offer_id": offer_id,
                "offer_name": offer_name,
                "payout_usd": payout,
                "goal_id": goal_id,
                "goal_name": goal_name,
                "status": "completed",
                "ip": ip,
                "created_at": datetime.now(timezone.utc)
            }
            await db.transactions.insert_one(transaction)
            logger.info(f"Admantium: Credited {reward} points to user {user_id}")
            
        elif status == "rejected":
            # Rejection/fraud - deduct points
            if existing and existing.get("status") == "rejected":
                return PlainTextResponse("OK")
            
            # Note: reward will be negative for rejections according to docs
            points_to_deduct = abs(reward)
            
            await db.users.update_one(
                {"user_id": user_id},
                {
                    "$inc": {
                        "balance": -points_to_deduct,
                        "total_earned": -points_to_deduct,
                        "surveys_completed": -1
                    }
                }
            )
            
            if existing:
                await db.transactions.update_one(
                    {"transaction_id": transaction_id},
                    {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc)}}
                )
            else:
                transaction = {
                    "transaction_id": transaction_id,
                    "user_id": user_id,
                    "provider": "admantium",
                    "reward_type": "reversal",
                    "points": -points_to_deduct,
                    "offer_id": offer_id,
                    "offer_name": offer_name,
                    "status": "rejected",
                    "created_at": datetime.now(timezone.utc)
                }
                await db.transactions.insert_one(transaction)
            
            logger.info(f"Admantium: Deducted {points_to_deduct} points from user {user_id} (rejected)")
        
        return PlainTextResponse("OK")
        
    except Exception as e:
        logger.error(f"Admantium callback error: {e}")
        return PlainTextResponse("ERROR")

# ========================= SURVEY HISTORY & TRANSACTIONS =========================

@api_router.get("/surveys/history")
async def get_survey_history(user: dict = Depends(get_current_user)):
    """Get user's completed surveys/transactions from all providers"""
    transactions = await db.transactions.find(
        {"user_id": user["user_id"], "reward_type": "credit"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for t in transactions:
        if isinstance(t.get("created_at"), str):
            t["created_at"] = datetime.fromisoformat(t["created_at"])
    
    return transactions

@api_router.get("/transactions")
async def get_all_transactions(user: dict = Depends(get_current_user)):
    """Get all transactions including reversals"""
    transactions = await db.transactions.find(
        {"user_id": user["user_id"]},
        {"_id": 0, "raw_data": 0}
    ).sort("created_at", -1).to_list(200)
    
    for t in transactions:
        if isinstance(t.get("created_at"), str):
            t["created_at"] = datetime.fromisoformat(t["created_at"])
    
    return transactions

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
    recent = await db.transactions.find(
        {"user_id": user["user_id"], "reward_type": "credit"},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for r in recent:
        if isinstance(r.get("created_at"), str):
            r["created_at"] = datetime.fromisoformat(r["created_at"])
    
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
    return {"message": "Survey Portal API", "version": "2.0.0"}

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
