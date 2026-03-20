import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from passlib.hash import bcrypt

from models.schemas import UserCreate, UserResponse, LoginRequest
from utils.database import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    """Register a new user"""
    existing_user = await db.users.find_one({
        "$or": [
            {"username": user.username},
            {"email": user.email}
        ]
    })
    
    if existing_user:
        if existing_user.get("username") == user.username:
            raise HTTPException(status_code=400, detail="Username already taken")
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_password = bcrypt.hash(user.password)
    
    user_doc = {
        "id": user_id,
        "username": user.username,
        "email": user.email,
        "password_hash": hashed_password,
        "public_key": user.public_key,
        "identity_key": user.identity_key,
        "signed_prekey": user.signed_prekey,
        "prekey_signature": user.prekey_signature,
        "created_at": datetime.utcnow(),
        "is_online": False,
        "last_seen": datetime.utcnow(),
    }
    
    await db.users.insert_one(user_doc)
    logger.info(f"User registered: {user.username}")
    
    return UserResponse(
        id=user_id,
        username=user.username,
        email=user.email,
        public_key=user.public_key,
        identity_key=user.identity_key,
        signed_prekey=user.signed_prekey,
        prekey_signature=user.prekey_signature,
        created_at=user_doc["created_at"]
    )


@router.post("/login", response_model=UserResponse)
async def login(credentials: LoginRequest):
    """Login user"""
    user = await db.users.find_one({"email": credentials.email})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.verify(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    logger.info(f"User logged in: {user['username']}")
    
    return UserResponse(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        public_key=user["public_key"],
        identity_key=user["identity_key"],
        signed_prekey=user["signed_prekey"],
        prekey_signature=user["prekey_signature"],
        created_at=user["created_at"]
    )


@router.get("/check-username/{username}")
async def check_username(username: str):
    """Check if username is available"""
    user = await db.users.find_one({"username": username})
    return {"available": user is None}
