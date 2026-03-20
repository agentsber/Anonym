import uuid
import logging
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, HTTPException

from models.schemas import (
    GroupCreate, GroupResponse, GroupUpdate, 
    GroupMessageSend, GroupMessageResponse, GroupMessageEdit,
    GroupMemberUpdate, GroupBanMember
)
from utils.database import db
from utils.websocket import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post("", response_model=GroupResponse)
async def create_group(group: GroupCreate):
    """Create a group"""
    creator = await db.users.find_one({"id": group.creator_id})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    group_id = str(uuid.uuid4())
    members = list(set([group.creator_id] + group.member_ids))
    
    group_doc = {
        "id": group_id,
        "name": group.name,
        "creator_id": group.creator_id,
        "description": group.description,
        "members": members,
        "admins": [group.creator_id],
        "banned_members": [],
        "created_at": datetime.utcnow()
    }
    
    await db.groups.insert_one(group_doc)
    logger.info(f"Group {group_id} created")
    
    return GroupResponse(
        id=group_id,
        name=group.name,
        creator_id=group.creator_id,
        description=group.description,
        members=members,
        created_at=group_doc["created_at"]
    )


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(group_id: str):
    """Get group info"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    return GroupResponse(
        id=group["id"],
        name=group["name"],
        creator_id=group["creator_id"],
        description=group.get("description"),
        members=group["members"],
        created_at=group["created_at"]
    )


@router.put("/{group_id}")
async def update_group(group_id: str, update: GroupUpdate, user_id: str):
    """Update group"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if user_id not in group.get("admins", [group["creator_id"]]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {}
    if update.name:
        update_data["name"] = update.name
    if update.description is not None:
        update_data["description"] = update.description
    
    if update_data:
        await db.groups.update_one({"id": group_id}, {"$set": update_data})
    
    return {"status": "updated"}


@router.delete("/{group_id}")
async def delete_group(group_id: str, user_id: str):
    """Delete group"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group["creator_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.groups.delete_one({"id": group_id})
    await db.group_messages.delete_many({"group_id": group_id})
    
    return {"status": "deleted"}


@router.get("/user/{user_id}", response_model=List[GroupResponse])
async def get_user_groups(user_id: str):
    """Get user's groups"""
    groups = await db.groups.find({"members": user_id}).to_list(100)
    
    return [GroupResponse(
        id=g["id"],
        name=g["name"],
        creator_id=g["creator_id"],
        description=g.get("description"),
        members=g["members"],
        created_at=g["created_at"]
    ) for g in groups]


@router.post("/{group_id}/members/{member_id}")
async def add_member(group_id: str, member_id: str, user_id: str):
    """Add member to group"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if user_id not in group.get("admins", [group["creator_id"]]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if member_id in group.get("banned_members", []):
        raise HTTPException(status_code=403, detail="Member is banned")
    
    await db.groups.update_one({"id": group_id}, {"$addToSet": {"members": member_id}})
    return {"status": "added"}


@router.delete("/{group_id}/members/{member_id}")
async def remove_member(group_id: str, member_id: str, user_id: str):
    """Remove member"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    is_admin = user_id in group.get("admins", [group["creator_id"]])
    is_self = user_id == member_id
    
    if not is_admin and not is_self:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.groups.update_one({"id": group_id}, {"$pull": {"members": member_id, "admins": member_id}})
    return {"status": "removed"}


@router.post("/{group_id}/messages", response_model=GroupMessageResponse)
async def send_group_message(group_id: str, message: GroupMessageSend):
    """Send group message"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if message.sender_id not in group["members"]:
        raise HTTPException(status_code=403, detail="Not a member")
    
    message_id = str(uuid.uuid4())
    expires_at = None
    if message.auto_delete_seconds:
        expires_at = datetime.utcnow() + timedelta(seconds=message.auto_delete_seconds)
    
    msg_doc = {
        "id": message_id,
        "group_id": group_id,
        "sender_id": message.sender_id,
        "encrypted_content": message.encrypted_content,
        "ephemeral_key": message.ephemeral_key,
        "message_type": message.message_type,
        "timestamp": datetime.utcnow(),
        "reply_to_id": message.reply_to_id,
        "auto_delete_seconds": message.auto_delete_seconds,
        "expires_at": expires_at,
        "edited": False,
        "deleted": False
    }
    
    await db.group_messages.insert_one(msg_doc)
    
    # Notify members
    for member_id in group["members"]:
        if member_id != message.sender_id and manager.is_online(member_id):
            notification = {
                "type": "new_group_message",
                "group_id": group_id,
                "message": {
                    "id": message_id,
                    "sender_id": message.sender_id,
                    "encrypted_content": message.encrypted_content,
                    "ephemeral_key": message.ephemeral_key,
                    "timestamp": msg_doc["timestamp"].isoformat()
                }
            }
            await manager.send_personal_message(notification, member_id)
    
    return GroupMessageResponse(
        id=message_id,
        group_id=group_id,
        sender_id=message.sender_id,
        encrypted_content=message.encrypted_content,
        ephemeral_key=message.ephemeral_key,
        message_type=message.message_type,
        timestamp=msg_doc["timestamp"],
        reply_to_id=message.reply_to_id,
        auto_delete_seconds=message.auto_delete_seconds,
        expires_at=expires_at
    )


@router.get("/{group_id}/messages", response_model=List[GroupMessageResponse])
async def get_group_messages(group_id: str, limit: int = 50, offset: int = 0):
    """Get group messages"""
    messages = await db.group_messages.find({
        "group_id": group_id,
        "deleted": {"$ne": True}
    }).sort("timestamp", -1).skip(offset).limit(limit).to_list(limit)
    
    return [GroupMessageResponse(
        id=m["id"],
        group_id=m["group_id"],
        sender_id=m["sender_id"],
        encrypted_content=m["encrypted_content"],
        ephemeral_key=m["ephemeral_key"],
        message_type=m["message_type"],
        timestamp=m["timestamp"],
        reply_to_id=m.get("reply_to_id"),
        auto_delete_seconds=m.get("auto_delete_seconds"),
        expires_at=m.get("expires_at"),
        edited=m.get("edited", False),
        deleted=m.get("deleted", False)
    ) for m in reversed(messages)]
