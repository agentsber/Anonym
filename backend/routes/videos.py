import uuid
import base64
import logging
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Response

from models.schemas import VideoCreate, VideoResponse
from utils.database import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/videos", tags=["Videos"])


@router.post("/upload")
async def upload_video(video: VideoCreate):
    """Upload video to feed"""
    user = await db.users.find_one({"id": video.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    video_id = str(uuid.uuid4())
    
    video_doc = {
        "id": video_id,
        "user_id": video.user_id,
        "description": video.description,
        "privacy": video.privacy,
        "video_data": video.video_data,
        "editor_metadata": video.editor_metadata,
        "likes": [],
        "comments": [],
        "views": 0,
        "created_at": datetime.utcnow()
    }
    
    await db.videos.insert_one(video_doc)
    logger.info(f"Video {video_id} uploaded")
    
    return {
        "id": video_id,
        "video_url": f"/api/videos/{video_id}/stream",
        "status": "uploaded"
    }


@router.get("/feed/{user_id}")
async def get_feed(user_id: str, limit: int = 20, offset: int = 0):
    """Get video feed"""
    videos = await db.videos.find({
        "$or": [
            {"privacy": "public"},
            {"user_id": user_id}
        ]
    }).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    result = []
    for v in videos:
        creator = await db.users.find_one({"id": v["user_id"]}, {"username": 1, "avatar_url": 1})
        result.append({
            "id": v["id"],
            "user_id": v["user_id"],
            "username": creator.get("username") if creator else "Unknown",
            "avatar_url": creator.get("avatar_url") if creator else None,
            "description": v["description"],
            "video_url": f"/api/videos/{v['id']}/stream",
            "likes_count": len(v.get("likes", [])),
            "comments_count": len(v.get("comments", [])),
            "views": v.get("views", 0),
            "is_liked": user_id in v.get("likes", []),
            "created_at": v["created_at"].isoformat()
        })
    
    return result


@router.get("/{video_id}/stream")
async def stream_video(video_id: str):
    """Stream video"""
    video = await db.videos.find_one({"id": video_id})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    await db.videos.update_one({"id": video_id}, {"$inc": {"views": 1}})
    
    content = base64.b64decode(video["video_data"])
    return Response(
        content=content,
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"}
    )


@router.get("/{video_id}")
async def get_video(video_id: str):
    """Get video info"""
    video = await db.videos.find_one({"id": video_id})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    creator = await db.users.find_one({"id": video["user_id"]}, {"username": 1})
    
    return {
        "id": video["id"],
        "user_id": video["user_id"],
        "username": creator.get("username") if creator else "Unknown",
        "description": video["description"],
        "video_url": f"/api/videos/{video_id}/stream",
        "likes": video.get("likes", []),
        "comments": video.get("comments", []),
        "views": video.get("views", 0),
        "created_at": video["created_at"].isoformat()
    }


@router.post("/{video_id}/like")
async def like_video(video_id: str, user_id: str):
    """Like/unlike video"""
    video = await db.videos.find_one({"id": video_id})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    likes = video.get("likes", [])
    if user_id in likes:
        await db.videos.update_one({"id": video_id}, {"$pull": {"likes": user_id}})
        return {"status": "unliked"}
    else:
        await db.videos.update_one({"id": video_id}, {"$addToSet": {"likes": user_id}})
        return {"status": "liked"}


@router.post("/{video_id}/comment")
async def add_comment(video_id: str, user_id: str, text: str):
    """Add comment"""
    video = await db.videos.find_one({"id": video_id})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    user = await db.users.find_one({"id": user_id}, {"username": 1})
    
    comment = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "username": user.get("username") if user else "Unknown",
        "text": text,
        "created_at": datetime.utcnow().isoformat()
    }
    
    await db.videos.update_one({"id": video_id}, {"$push": {"comments": comment}})
    return {"status": "added", "comment": comment}


@router.get("/{video_id}/comments")
async def get_comments(video_id: str):
    """Get comments"""
    video = await db.videos.find_one({"id": video_id}, {"comments": 1})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video.get("comments", [])


@router.delete("/{video_id}")
async def delete_video(video_id: str, user_id: str):
    """Delete video"""
    video = await db.videos.find_one({"id": video_id})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if video["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.videos.delete_one({"id": video_id})
    return {"status": "deleted"}


@router.get("/user/{target_user_id}")
async def get_user_videos(target_user_id: str, limit: int = 20):
    """Get user's videos"""
    videos = await db.videos.find({"user_id": target_user_id}).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [{
        "id": v["id"],
        "description": v["description"],
        "video_url": f"/api/videos/{v['id']}/stream",
        "likes_count": len(v.get("likes", [])),
        "views": v.get("views", 0),
        "created_at": v["created_at"].isoformat()
    } for v in videos]
