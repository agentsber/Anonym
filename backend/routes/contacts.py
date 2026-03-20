import uuid
import logging
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException

from models.schemas import UserPublicInfo
from utils.database import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contacts", tags=["Contacts"])


@router.post("/add")
async def add_contact(user_id: str, contact_id: str):
    """Add a contact"""
    user = await db.users.find_one({"id": user_id})
    contact = await db.users.find_one({"id": contact_id})
    
    if not user or not contact:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing = await db.contacts.find_one({
        "user_id": user_id,
        "contact_id": contact_id
    })
    
    if existing:
        return {"status": "already_exists"}
    
    contact_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "contact_id": contact_id,
        "created_at": datetime.utcnow()
    }
    
    await db.contacts.insert_one(contact_doc)
    return {"status": "added", "contact_id": contact_id, "id": contact_doc["id"]}


@router.get("/{user_id}", response_model=List[UserPublicInfo])
async def get_contacts(user_id: str):
    """Get all contacts"""
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$lookup": {
            "from": "users",
            "localField": "contact_id",
            "foreignField": "id",
            "as": "user_info"
        }},
        {"$unwind": "$user_info"},
        {"$limit": 1000},
        {"$project": {
            "id": "$user_info.id",
            "username": "$user_info.username",
            "public_key": "$user_info.public_key",
            "identity_key": "$user_info.identity_key",
            "signed_prekey": "$user_info.signed_prekey",
            "prekey_signature": "$user_info.prekey_signature"
        }}
    ]
    
    contacts = await db.contacts.aggregate(pipeline).to_list(1000)
    
    return [UserPublicInfo(
        id=contact["id"],
        username=contact["username"],
        public_key=contact["public_key"],
        identity_key=contact["identity_key"],
        signed_prekey=contact["signed_prekey"],
        prekey_signature=contact["prekey_signature"]
    ) for contact in contacts]


@router.delete("/{user_id}/{contact_id}")
async def remove_contact(user_id: str, contact_id: str):
    """Remove a contact"""
    result = await db.contacts.delete_one({
        "user_id": user_id,
        "contact_id": contact_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    return {"status": "removed"}
