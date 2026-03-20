import uuid
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from passlib.hash import bcrypt
from pydantic import BaseModel

from models.schemas import UserCreate, UserResponse, LoginRequest
from utils.database import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequestWithDevice(BaseModel):
    email: str
    password: str
    device_name: Optional[str] = None
    device_type: Optional[str] = None  # android, ios, web
    app_version: Optional[str] = None


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
async def login(credentials: LoginRequestWithDevice, request: Request):
    """Login user"""
    user = await db.users.find_one({"email": credentials.email})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.verify(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Get client IP
    client_ip = request.client.host if request.client else "Unknown"
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    # Create session/device record
    session_id = str(uuid.uuid4())
    device_doc = {
        "id": session_id,
        "user_id": user["id"],
        "device_name": credentials.device_name or "Unknown Device",
        "device_type": credentials.device_type or "unknown",
        "app_version": credentials.app_version,
        "ip_address": client_ip,
        "last_active": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "is_current": True
    }
    
    await db.sessions.insert_one(device_doc)
    logger.info(f"User logged in: {user['username']} from {credentials.device_name}")
    
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


@router.get("/devices/{user_id}")
async def get_devices(user_id: str):
    """Get all devices/sessions for a user"""
    sessions = await db.sessions.find({"user_id": user_id}).sort("last_active", -1).to_list(50)
    
    return [{
        "id": s["id"],
        "device_name": s.get("device_name", "Unknown"),
        "device_type": s.get("device_type", "unknown"),
        "app_version": s.get("app_version"),
        "ip_address": s.get("ip_address", "Unknown"),
        "last_active": s.get("last_active", s.get("created_at")).isoformat() if s.get("last_active") or s.get("created_at") else None,
        "created_at": s.get("created_at").isoformat() if s.get("created_at") else None,
        "is_current": s.get("is_current", False)
    } for s in sessions]


@router.delete("/devices/{session_id}")
async def terminate_session(session_id: str, user_id: str):
    """Terminate a session/device"""
    result = await db.sessions.delete_one({"id": session_id, "user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"status": "terminated"}


@router.delete("/devices/all/{user_id}")
async def terminate_all_sessions(user_id: str, except_current: bool = True):
    """Terminate all sessions except current"""
    if except_current:
        await db.sessions.delete_many({"user_id": user_id, "is_current": {"$ne": True}})
    else:
        await db.sessions.delete_many({"user_id": user_id})
    
    return {"status": "all_terminated"}
