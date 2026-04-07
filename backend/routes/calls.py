import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException

from models.schemas import CallInitiate, CallAnswer, CallIceCandidate, CallAction
from utils.database import db
from utils.websocket import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/calls", tags=["Calls"])

active_calls = {}


@router.post("/initiate")
async def initiate_call(call: CallInitiate):
    """Initiate a call"""
    caller = await db.users.find_one({"id": call.caller_id})
    callee = await db.users.find_one({"id": call.callee_id})
    
    if not caller or not callee:
        raise HTTPException(status_code=404, detail="User not found")
    
    call_id = str(uuid.uuid4())
    
    call_doc = {
        "id": call_id,
        "caller_id": call.caller_id,
        "callee_id": call.callee_id,
        "call_type": call.call_type,
        "status": "ringing",
        "started_at": datetime.utcnow(),
        "offer": call.offer
    }
    
    await db.calls.insert_one(call_doc)
    active_calls[call_id] = call_doc
    
    if manager.is_online(call.callee_id):
        notification = {
            "type": "incoming_call",
            "call_id": call_id,
            "caller_id": call.caller_id,
            "caller_username": caller.get("username"),
            "call_type": call.call_type,
            "offer": call.offer
        }
        await manager.send_personal_message(notification, call.callee_id)
    
    logger.info(f"Call {call_id} initiated")
    return {"call_id": call_id, "status": "ringing"}


@router.post("/answer")
async def answer_call(answer: CallAnswer):
    """Answer a call"""
    call = active_calls.get(answer.call_id)
    if not call:
        call = await db.calls.find_one({"id": answer.call_id})
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    await db.calls.update_one(
        {"id": answer.call_id},
        {"$set": {"status": "connected", "answer": answer.answer}}
    )
    
    if answer.call_id in active_calls:
        active_calls[answer.call_id]["status"] = "connected"
        active_calls[answer.call_id]["answer"] = answer.answer
    
    if manager.is_online(call["caller_id"]):
        notification = {
            "type": "call_answered",
            "call_id": answer.call_id,
            "answer": answer.answer
        }
        await manager.send_personal_message(notification, call["caller_id"])
    
    return {"status": "connected"}


@router.post("/ice-candidate")
async def add_ice_candidate(ice: CallIceCandidate):
    """Add ICE candidate"""
    call = active_calls.get(ice.call_id)
    if not call:
        call = await db.calls.find_one({"id": ice.call_id})
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    other_user = call["callee_id"] if call["caller_id"] == ice.user_id else call["caller_id"]
    
    if manager.is_online(other_user):
        notification = {
            "type": "ice_candidate",
            "call_id": ice.call_id,
            "candidate": ice.candidate
        }
        await manager.send_personal_message(notification, other_user)
    
    return {"status": "sent"}


@router.post("/action")
async def call_action(action: CallAction):
    """Handle call action (end, reject, toggle)"""
    call = active_calls.get(action.call_id)
    if not call:
        call = await db.calls.find_one({"id": action.call_id})
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    if action.action in ["end", "reject"]:
        await db.calls.update_one(
            {"id": action.call_id},
            {"$set": {"status": "ended", "ended_at": datetime.utcnow()}}
        )
        if action.call_id in active_calls:
            del active_calls[action.call_id]
    
    other_user = call["callee_id"] if call["caller_id"] == action.user_id else call["caller_id"]
    
    if manager.is_online(other_user):
        notification = {
            "type": "call_action",
            "call_id": action.call_id,
            "action": action.action,
            "from_user": action.user_id
        }
        await manager.send_personal_message(notification, other_user)
    
    return {"status": action.action}


@router.get("/history/{user_id}")
async def get_call_history(user_id: str, limit: int = 50):
    """Get call history"""
    calls = await db.calls.find({
        "$or": [
            {"caller_id": user_id},
            {"callee_id": user_id}
        ]
    }).sort("started_at", -1).limit(limit).to_list(limit)
    
    result = []
    for c in calls:
        other_id = c["callee_id"] if c["caller_id"] == user_id else c["caller_id"]
        other = await db.users.find_one({"id": other_id}, {"username": 1})
        
        result.append({
            "id": c["id"],
            "other_user_id": other_id,
            "other_username": other.get("username") if other else "Unknown",
            "call_type": c["call_type"],
            "is_outgoing": c["caller_id"] == user_id,
            "status": c["status"],
            "started_at": c["started_at"].isoformat(),
            "ended_at": c.get("ended_at", "").isoformat() if c.get("ended_at") else None
        })
    
    return result


@router.get("/active/{user_id}")
async def get_active_call(user_id: str):
    """Get active call"""
    for call_id, call in active_calls.items():
        if call["caller_id"] == user_id or call["callee_id"] == user_id:
            if call["status"] in ["ringing", "connected"]:
                return {"call_id": call_id, "call": call}
    return {"call_id": None}
