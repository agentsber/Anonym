import uuid
import base64
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Form, Response

from utils.database import db
from utils.websocket import manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Media"])


@router.post("/media/upload")
async def upload_media(
    sender_id: str = Form(...),
    receiver_id: str = Form(...),
    encrypted_data: str = Form(...),
    ephemeral_key: str = Form(...),
    media_type: str = Form(...),
    file_name: str = Form(default="media")
):
    """Upload encrypted media"""
    media_id = str(uuid.uuid4())
    
    media_doc = {
        "id": media_id,
        "sender_id": sender_id,
        "receiver_id": receiver_id,
        "encrypted_data": encrypted_data,
        "ephemeral_key": ephemeral_key,
        "media_type": media_type,
        "file_name": file_name,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    await db.media.insert_one(media_doc)
    logger.info(f"Media {media_id} uploaded")
    
    if manager.is_online(receiver_id):
        notification = {
            "type": "new_media",
            "media": {
                "id": media_id,
                "sender_id": sender_id,
                "media_type": media_type,
                "timestamp": media_doc["created_at"].isoformat()
            }
        }
        await manager.send_personal_message(notification, receiver_id)
    
    return {
        "id": media_id,
        "status": "uploaded",
        "media_url": f"/api/media/{media_id}"
    }


@router.get("/media/{media_id}")
async def get_media(media_id: str):
    """Get media"""
    media = await db.media.find_one({"id": media_id})
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    return {
        "id": media["id"],
        "sender_id": media["sender_id"],
        "receiver_id": media["receiver_id"],
        "encrypted_data": media["encrypted_data"],
        "ephemeral_key": media["ephemeral_key"],
        "media_type": media["media_type"],
        "file_name": media["file_name"]
    }


@router.post("/media/{media_id}/delivered")
async def mark_media_delivered(media_id: str):
    """Mark media as delivered"""
    result = await db.media.find_one_and_delete({"id": media_id})
    if not result:
        raise HTTPException(status_code=404, detail="Media not found")
    return {"status": "delivered"}


@router.post("/upload/voice")
async def upload_voice(
    file: bytes = Form(...),
    sender_id: str = Form(...),
    duration: float = Form(default=0)
):
    """Upload voice message"""
    file_id = str(uuid.uuid4())
    
    voice_doc = {
        "id": file_id,
        "sender_id": sender_id,
        "data": base64.b64encode(file).decode() if isinstance(file, bytes) else file,
        "duration": duration,
        "content_type": "audio/m4a",
        "created_at": datetime.utcnow()
    }
    
    await db.voice_messages.insert_one(voice_doc)
    logger.info(f"Voice message {file_id} uploaded")
    
    return {
        "id": file_id,
        "url": f"/api/voice/{file_id}",
        "duration": duration
    }


@router.get("/voice/{file_id}")
async def get_voice(file_id: str):
    """Get voice message"""
    voice = await db.voice_messages.find_one({"id": file_id})
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")
    
    content = base64.b64decode(voice["data"])
    return Response(
        content=content,
        media_type=voice["content_type"],
        headers={"Content-Disposition": f'attachment; filename="voice_{file_id}.m4a"'}
    )


@router.post("/upload/avatar")
async def upload_avatar(user_id: str, image_data: str):
    """Upload avatar"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    file_id = str(uuid.uuid4())
    
    avatar_doc = {
        "id": file_id,
        "user_id": user_id,
        "data": image_data,
        "created_at": datetime.utcnow()
    }
    
    await db.avatars.insert_one(avatar_doc)
    
    avatar_url = f"/api/avatar/{file_id}"
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"avatar_url": avatar_url}}
    )
    
    return {"id": file_id, "url": avatar_url}


@router.get("/avatar/{file_id}")
async def get_avatar(file_id: str):
    """Get avatar"""
    avatar = await db.avatars.find_one({"id": file_id})
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    content = base64.b64decode(avatar["data"])
    return Response(
        content=content,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=31536000"}
    )
