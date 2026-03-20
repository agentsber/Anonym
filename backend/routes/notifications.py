import logging
from datetime import datetime
from fastapi import APIRouter

from utils.database import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("/register-token")
async def register_push_token(user_id: str, push_token: str):
    """Register push notification token"""
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"push_token": push_token, "push_token_updated": datetime.utcnow()}}
    )
    logger.info(f"Push token registered for {user_id}")
    return {"status": "registered"}


@router.post("/settings")
async def update_notification_settings(
    user_id: str,
    messages: bool = True,
    calls: bool = True,
    groups: bool = True,
    mentions: bool = True
):
    """Update notification settings"""
    settings = {
        "notification_settings": {
            "messages": messages,
            "calls": calls,
            "groups": groups,
            "mentions": mentions,
            "updated_at": datetime.utcnow()
        }
    }
    
    await db.users.update_one({"id": user_id}, {"$set": settings})
    return {"status": "updated", "settings": settings["notification_settings"]}


@router.get("/settings/{user_id}")
async def get_notification_settings(user_id: str):
    """Get notification settings"""
    user = await db.users.find_one({"id": user_id}, {"notification_settings": 1})
    
    default_settings = {
        "messages": True,
        "calls": True,
        "groups": True,
        "mentions": True
    }
    
    if user and user.get("notification_settings"):
        return user["notification_settings"]
    return default_settings


@router.delete("/token/{user_id}")
async def remove_push_token(user_id: str):
    """Remove push token"""
    await db.users.update_one(
        {"id": user_id},
        {"$unset": {"push_token": ""}}
    )
    return {"status": "removed"}
