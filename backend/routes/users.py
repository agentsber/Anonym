import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException

from models.schemas import UserPublicInfo, ProfileUpdate
from utils.database import db
from utils.websocket import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/search", response_model=Optional[UserPublicInfo])
async def search_user(username: str):
    """Search for user by username"""
    user = await db.users.find_one({"username": username})
    if not user:
        return None
    
    return UserPublicInfo(
        id=user["id"],
        username=user["username"],
        public_key=user["public_key"],
        identity_key=user["identity_key"],
        signed_prekey=user["signed_prekey"],
        prekey_signature=user["prekey_signature"]
    )


@router.get("/{user_id}", response_model=UserPublicInfo)
async def get_user(user_id: str):
    """Get user public info"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserPublicInfo(
        id=user["id"],
        username=user["username"],
        public_key=user["public_key"],
        identity_key=user["identity_key"],
        signed_prekey=user["signed_prekey"],
        prekey_signature=user["prekey_signature"]
    )


@router.put("/{user_id}/profile")
async def update_profile(user_id: str, profile: ProfileUpdate):
    """Update user profile"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    if profile.display_name is not None:
        update_data["display_name"] = profile.display_name
    if profile.bio is not None:
        update_data["bio"] = profile.bio
    if profile.birthday is not None:
        update_data["birthday"] = profile.birthday
    if profile.avatar_url is not None:
        update_data["avatar_url"] = profile.avatar_url
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user_id})
    
    return {
        "id": updated_user["id"],
        "username": updated_user["username"],
        "display_name": updated_user.get("display_name"),
        "bio": updated_user.get("bio"),
        "birthday": updated_user.get("birthday"),
        "avatar_url": updated_user.get("avatar_url")
    }


@router.get("/{user_id}/profile")
async def get_profile(user_id: str):
    """Get user profile"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user["id"],
        "username": user["username"],
        "display_name": user.get("display_name"),
        "bio": user.get("bio"),
        "birthday": user.get("birthday"),
        "avatar_url": user.get("avatar_url")
    }


@router.get("/check-username/{username}")
async def check_username_exists(username: str):
    """Check if username exists"""
    user = await db.users.find_one({"username": username})
    return {"exists": user is not None}


@router.get("/{user_id}/status")
async def get_user_status(user_id: str):
    """Get user online status"""
    online = manager.is_online(user_id)
    
    if online:
        return {
            "user_id": user_id,
            "online": True,
            "last_seen": datetime.utcnow().isoformat()
        }
    
    user = await db.users.find_one({"id": user_id}, {"last_seen": 1, "is_online": 1})
    if user:
        last_seen = user.get("last_seen")
        return {
            "user_id": user_id,
            "online": False,
            "last_seen": last_seen.isoformat() if last_seen else None
        }
    
    last_seen = manager.get_last_seen(user_id)
    return {
        "user_id": user_id,
        "online": False,
        "last_seen": last_seen.isoformat() if last_seen else None
    }
