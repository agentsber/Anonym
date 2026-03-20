import uuid
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, HTTPException

from models.schemas import MessageSend, MessageResponse, MessageEdit
from utils.database import db
from utils.websocket import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/messages", tags=["Messages"])


async def notify_new_message(user_id: str, sender_name: str, preview: str, sender_id: str):
    """Send push notification for new message"""
    try:
        user = await db.users.find_one({"id": user_id}, {"push_token": 1})
        if user and user.get("push_token"):
            logger.info(f"Push notification would be sent to {user_id}")
    except Exception as e:
        logger.error(f"Push notification error: {e}")


@router.post("/send", response_model=MessageResponse)
async def send_message(message: MessageSend):
    """Send an encrypted message"""
    sender = await db.users.find_one({"id": message.sender_id})
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")
    
    receiver = await db.users.find_one({"id": message.receiver_id})
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    message_id = str(uuid.uuid4())
    
    expires_at = None
    if message.auto_delete_seconds:
        expires_at = datetime.utcnow() + timedelta(seconds=message.auto_delete_seconds)
    
    message_doc = {
        "id": message_id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "encrypted_content": message.encrypted_content,
        "ephemeral_key": message.ephemeral_key,
        "message_type": message.message_type,
        "status": "pending",
        "timestamp": datetime.utcnow(),
        "reply_to_id": message.reply_to_id,
        "auto_delete_seconds": message.auto_delete_seconds,
        "expires_at": expires_at,
        "edited": False,
        "deleted": False
    }
    
    await db.messages.insert_one(message_doc)
    logger.info(f"Message {message_id} stored")
    
    if manager.is_online(message.receiver_id):
        notification = {
            "type": "new_message",
            "message": {
                "id": message_id,
                "sender_id": message.sender_id,
                "encrypted_content": message.encrypted_content,
                "ephemeral_key": message.ephemeral_key,
                "message_type": message.message_type,
                "timestamp": message_doc["timestamp"].isoformat(),
                "reply_to_id": message.reply_to_id,
                "auto_delete_seconds": message.auto_delete_seconds,
                "expires_at": expires_at.isoformat() if expires_at else None
            }
        }
        await manager.send_personal_message(notification, message.receiver_id)
    else:
        asyncio.create_task(
            notify_new_message(
                message.receiver_id,
                sender.get("username", "Unknown"),
                "Новое сообщение",
                message.sender_id
            )
        )
    
    return MessageResponse(
        id=message_id,
        sender_id=message.sender_id,
        receiver_id=message.receiver_id,
        encrypted_content=message.encrypted_content,
        ephemeral_key=message.ephemeral_key,
        message_type=message.message_type,
        status="pending",
        timestamp=message_doc["timestamp"],
        reply_to_id=message.reply_to_id,
        auto_delete_seconds=message.auto_delete_seconds,
        expires_at=expires_at
    )


@router.get("/pending/{user_id}", response_model=List[MessageResponse])
async def get_pending_messages(user_id: str):
    """Get pending messages"""
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"last_seen": datetime.utcnow()}}
    )
    
    messages = await db.messages.find({
        "receiver_id": user_id,
        "status": "pending",
        "deleted": {"$ne": True}
    }).to_list(1000)
    
    return [MessageResponse(
        id=msg["id"],
        sender_id=msg["sender_id"],
        receiver_id=msg["receiver_id"],
        encrypted_content=msg["encrypted_content"],
        ephemeral_key=msg["ephemeral_key"],
        message_type=msg["message_type"],
        status=msg["status"],
        timestamp=msg["timestamp"],
        reply_to_id=msg.get("reply_to_id"),
        auto_delete_seconds=msg.get("auto_delete_seconds"),
        expires_at=msg.get("expires_at")
    ) for msg in messages]


@router.post("/{message_id}/delivered")
async def mark_delivered(message_id: str):
    """Mark message as delivered"""
    result = await db.messages.find_one_and_delete({"id": message_id})
    if not result:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"status": "delivered", "message_id": message_id}


@router.post("/{message_id}/read")
async def mark_read(message_id: str, reader_id: str):
    """Mark message as read"""
    message = await db.messages.find_one({"id": message_id})
    
    if message and manager.is_online(message["sender_id"]):
        notification = {
            "type": "message_read",
            "message_id": message_id,
            "reader_id": reader_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        await manager.send_personal_message(notification, message["sender_id"])
    
    return {"status": "read", "message_id": message_id}


@router.put("/{message_id}/edit")
async def edit_message(message_id: str, edit: MessageEdit):
    """Edit a message"""
    message = await db.messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    await db.messages.update_one(
        {"id": message_id},
        {"$set": {
            "encrypted_content": edit.encrypted_content,
            "ephemeral_key": edit.ephemeral_key,
            "edited": True,
            "edited_at": datetime.utcnow()
        }}
    )
    
    if manager.is_online(message["receiver_id"]):
        notification = {
            "type": "message_edited",
            "message_id": message_id,
            "encrypted_content": edit.encrypted_content,
            "ephemeral_key": edit.ephemeral_key,
            "timestamp": datetime.utcnow().isoformat()
        }
        await manager.send_personal_message(notification, message["receiver_id"])
    
    return {"status": "edited", "message_id": message_id}


@router.delete("/{message_id}")
async def delete_message(message_id: str, user_id: str, for_everyone: bool = False):
    """Delete a message"""
    message = await db.messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if for_everyone:
        await db.messages.update_one(
            {"id": message_id},
            {"$set": {"deleted": True, "deleted_at": datetime.utcnow()}}
        )
        
        other_user = message["receiver_id"] if message["sender_id"] == user_id else message["sender_id"]
        if manager.is_online(other_user):
            notification = {
                "type": "message_deleted",
                "message_id": message_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            await manager.send_personal_message(notification, other_user)
    else:
        await db.messages.update_one(
            {"id": message_id},
            {"$addToSet": {"deleted_for": user_id}}
        )
    
    return {"status": "deleted", "message_id": message_id}


@router.get("/history/{user_id}/{contact_id}", response_model=List[MessageResponse])
async def get_history(user_id: str, contact_id: str, limit: int = 50, offset: int = 0):
    """Get message history"""
    messages = await db.messages.find({
        "$or": [
            {"sender_id": user_id, "receiver_id": contact_id},
            {"sender_id": contact_id, "receiver_id": user_id}
        ],
        "deleted": {"$ne": True},
        "deleted_for": {"$ne": user_id}
    }).sort("timestamp", -1).skip(offset).limit(limit).to_list(limit)
    
    return [MessageResponse(
        id=msg["id"],
        sender_id=msg["sender_id"],
        receiver_id=msg["receiver_id"],
        encrypted_content=msg["encrypted_content"],
        ephemeral_key=msg["ephemeral_key"],
        message_type=msg["message_type"],
        status=msg["status"],
        timestamp=msg["timestamp"],
        reply_to_id=msg.get("reply_to_id"),
        auto_delete_seconds=msg.get("auto_delete_seconds"),
        expires_at=msg.get("expires_at")
    ) for msg in reversed(messages)]
