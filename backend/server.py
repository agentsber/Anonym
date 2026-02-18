from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime
import json
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== Models ====================

class UserCreate(BaseModel):
    username: str
    public_key: str  # Base64 encoded public key
    identity_key: str  # Base64 encoded identity key for X3DH
    signed_prekey: str  # Base64 encoded signed prekey
    prekey_signature: str  # Base64 encoded signature

class UserResponse(BaseModel):
    id: str
    username: str
    public_key: str
    identity_key: str
    signed_prekey: str
    prekey_signature: str
    created_at: datetime

class UserPublicInfo(BaseModel):
    id: str
    username: str
    public_key: str
    identity_key: str
    signed_prekey: str
    prekey_signature: str

class MessageSend(BaseModel):
    sender_id: str
    receiver_id: str
    encrypted_content: str  # Base64 encoded encrypted message
    ephemeral_key: str  # Base64 encoded ephemeral public key for X3DH
    message_type: str = "text"  # text, image, video
    reply_to_id: Optional[str] = None  # ID of message being replied to
    auto_delete_seconds: Optional[int] = None  # Auto-delete timer (60, 3600, 86400)

class MessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    encrypted_content: str
    ephemeral_key: str
    message_type: str
    status: str  # pending, delivered, read
    timestamp: datetime
    reply_to_id: Optional[str] = None
    auto_delete_seconds: Optional[int] = None
    expires_at: Optional[datetime] = None

class MessageEdit(BaseModel):
    encrypted_content: str
    ephemeral_key: str

class LoginRequest(BaseModel):
    username: str

# ==================== WebSocket Connection Manager ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_last_seen: Dict[str, datetime] = {}
    
    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.user_last_seen[user_id] = datetime.utcnow()
        logger.info(f"User {user_id} connected via WebSocket")
        # Broadcast online status
        await self.broadcast_status(user_id, True)
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            self.user_last_seen[user_id] = datetime.utcnow()
            logger.info(f"User {user_id} disconnected from WebSocket")
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
                return True
            except:
                return False
        return False
    
    def is_online(self, user_id: str) -> bool:
        return user_id in self.active_connections
    
    def get_last_seen(self, user_id: str) -> Optional[datetime]:
        return self.user_last_seen.get(user_id)
    
    async def broadcast_status(self, user_id: str, online: bool):
        """Broadcast user online/offline status to all connected users"""
        status_msg = {
            "type": "user_status",
            "user_id": user_id,
            "online": online,
            "last_seen": datetime.utcnow().isoformat()
        }
        for uid, ws in self.active_connections.items():
            if uid != user_id:
                try:
                    await ws.send_json(status_msg)
                except:
                    pass

manager = ConnectionManager()

# ==================== Auth Endpoints ====================

@api_router.post("/auth/register", response_model=UserResponse)
async def register_user(user: UserCreate):
    """Register a new user with username and public keys"""
    # Check if username already exists
    existing_user = await db.users.find_one({"username": user.username.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Validate username format
    if len(user.username) < 3 or len(user.username) > 30:
        raise HTTPException(status_code=400, detail="Username must be 3-30 characters")
    
    if not user.username.isalnum():
        raise HTTPException(status_code=400, detail="Username must be alphanumeric")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "username": user.username.lower(),
        "public_key": user.public_key,
        "identity_key": user.identity_key,
        "signed_prekey": user.signed_prekey,
        "prekey_signature": user.prekey_signature,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_doc)
    logger.info(f"New user registered: {user.username}")
    
    return UserResponse(**user_doc)

@api_router.post("/auth/login", response_model=UserResponse)
async def login_user(request: LoginRequest):
    """Login user by username - returns user info if exists"""
    user = await db.users.find_one({"username": request.username.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user["id"],
        username=user["username"],
        public_key=user["public_key"],
        identity_key=user["identity_key"],
        signed_prekey=user["signed_prekey"],
        prekey_signature=user["prekey_signature"],
        created_at=user["created_at"]
    )

@api_router.get("/auth/check-username/{username}")
async def check_username(username: str):
    """Check if username is available"""
    existing = await db.users.find_one({"username": username.lower()})
    return {"available": existing is None}

# ==================== User Endpoints ====================

@api_router.get("/users/search", response_model=Optional[UserPublicInfo])
async def search_user(username: str):
    """Search for a user by exact username match"""
    user = await db.users.find_one({"username": username.lower()})
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

@api_router.get("/users/{user_id}", response_model=UserPublicInfo)
async def get_user(user_id: str):
    """Get user public info by ID"""
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

# ==================== Message Endpoints ====================

@api_router.post("/messages/send", response_model=MessageResponse)
async def send_message(message: MessageSend):
    """Send an encrypted message - server acts as relay"""
    # Verify sender exists
    sender = await db.users.find_one({"id": message.sender_id})
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")
    
    # Verify receiver exists
    receiver = await db.users.find_one({"id": message.receiver_id})
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    message_id = str(uuid.uuid4())
    message_doc = {
        "id": message_id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "encrypted_content": message.encrypted_content,
        "ephemeral_key": message.ephemeral_key,
        "message_type": message.message_type,
        "status": "pending",
        "timestamp": datetime.utcnow()
    }
    
    await db.messages.insert_one(message_doc)
    logger.info(f"Message {message_id} stored for relay")
    
    # Try to send via WebSocket if receiver is online
    if manager.is_online(message.receiver_id):
        notification = {
            "type": "new_message",
            "message": {
                "id": message_id,
                "sender_id": message.sender_id,
                "encrypted_content": message.encrypted_content,
                "ephemeral_key": message.ephemeral_key,
                "message_type": message.message_type,
                "timestamp": message_doc["timestamp"].isoformat()
            }
        }
        await manager.send_personal_message(notification, message.receiver_id)
    
    return MessageResponse(
        id=message_id,
        sender_id=message.sender_id,
        receiver_id=message.receiver_id,
        encrypted_content=message.encrypted_content,
        ephemeral_key=message.ephemeral_key,
        message_type=message.message_type,
        status="pending",
        timestamp=message_doc["timestamp"]
    )

@api_router.get("/messages/pending/{user_id}", response_model=List[MessageResponse])
async def get_pending_messages(user_id: str):
    """Get all pending messages for a user"""
    messages = await db.messages.find({
        "receiver_id": user_id,
        "status": "pending"
    }).to_list(1000)
    
    return [MessageResponse(
        id=msg["id"],
        sender_id=msg["sender_id"],
        receiver_id=msg["receiver_id"],
        encrypted_content=msg["encrypted_content"],
        ephemeral_key=msg["ephemeral_key"],
        message_type=msg["message_type"],
        status=msg["status"],
        timestamp=msg["timestamp"]
    ) for msg in messages]

@api_router.post("/messages/{message_id}/delivered")
async def mark_message_delivered(message_id: str):
    """Mark message as delivered and delete from server (relay complete)"""
    result = await db.messages.find_one_and_delete({"id": message_id})
    if not result:
        raise HTTPException(status_code=404, detail="Message not found")
    
    logger.info(f"Message {message_id} delivered and deleted from server")
    return {"status": "delivered", "message_id": message_id}

@api_router.get("/messages/history/{user_id}/{contact_id}", response_model=List[MessageResponse])
async def get_message_history(user_id: str, contact_id: str):
    """Get message history between two users (pending messages on server)"""
    messages = await db.messages.find({
        "$or": [
            {"sender_id": user_id, "receiver_id": contact_id},
            {"sender_id": contact_id, "receiver_id": user_id}
        ]
    }).sort("timestamp", 1).to_list(1000)
    
    return [MessageResponse(
        id=msg["id"],
        sender_id=msg["sender_id"],
        receiver_id=msg["receiver_id"],
        encrypted_content=msg["encrypted_content"],
        ephemeral_key=msg["ephemeral_key"],
        message_type=msg["message_type"],
        status=msg["status"],
        timestamp=msg["timestamp"]
    ) for msg in messages]

# ==================== Contacts Endpoints ====================

@api_router.post("/contacts/add")
async def add_contact(user_id: str, contact_id: str):
    """Add a contact to user's contact list"""
    # Verify both users exist
    user = await db.users.find_one({"id": user_id})
    contact = await db.users.find_one({"id": contact_id})
    
    if not user or not contact:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if contact already exists
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
    # Return serializable response (without MongoDB _id)
    return {
        "status": "added", 
        "contact_id": contact_id,
        "id": contact_doc["id"]
    }

@api_router.get("/contacts/{user_id}", response_model=List[UserPublicInfo])
async def get_contacts(user_id: str):
    """Get all contacts for a user"""
    contacts = await db.contacts.find({"user_id": user_id}).to_list(1000)
    
    contact_infos = []
    for contact in contacts:
        user = await db.users.find_one({"id": contact["contact_id"]})
        if user:
            contact_infos.append(UserPublicInfo(
                id=user["id"],
                username=user["username"],
                public_key=user["public_key"],
                identity_key=user["identity_key"],
                signed_prekey=user["signed_prekey"],
                prekey_signature=user["prekey_signature"]
            ))
    
    return contact_infos

# ==================== Media Endpoints ====================

@api_router.post("/media/upload")
async def upload_media(
    sender_id: str = Form(...),
    receiver_id: str = Form(...),
    encrypted_data: str = Form(...),  # Base64 encoded encrypted media
    ephemeral_key: str = Form(...),
    media_type: str = Form(...),  # image or video
    file_name: str = Form(default="media")
):
    """Upload encrypted media file for relay"""
    # Verify users exist
    sender = await db.users.find_one({"id": sender_id})
    receiver = await db.users.find_one({"id": receiver_id})
    
    if not sender or not receiver:
        raise HTTPException(status_code=404, detail="User not found")
    
    media_id = str(uuid.uuid4())
    
    # Store encrypted media in database (as base64)
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
    logger.info(f"Media {media_id} uploaded for relay")
    
    # Create message reference
    message_id = str(uuid.uuid4())
    message_doc = {
        "id": message_id,
        "sender_id": sender_id,
        "receiver_id": receiver_id,
        "encrypted_content": media_id,  # Reference to media
        "ephemeral_key": ephemeral_key,
        "message_type": media_type,
        "status": "pending",
        "timestamp": datetime.utcnow()
    }
    
    await db.messages.insert_one(message_doc)
    
    # Notify receiver if online
    if manager.is_online(receiver_id):
        notification = {
            "type": "new_message",
            "message": {
                "id": message_id,
                "sender_id": sender_id,
                "message_type": media_type,
                "media_id": media_id,
                "timestamp": message_doc["timestamp"].isoformat()
            }
        }
        await manager.send_personal_message(notification, receiver_id)
    
    return {
        "message_id": message_id,
        "media_id": media_id,
        "status": "uploaded"
    }

@api_router.get("/media/{media_id}")
async def get_media(media_id: str):
    """Get encrypted media by ID"""
    media = await db.media.find_one({"id": media_id})
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    return {
        "id": media["id"],
        "sender_id": media["sender_id"],
        "encrypted_data": media["encrypted_data"],
        "ephemeral_key": media["ephemeral_key"],
        "media_type": media["media_type"],
        "file_name": media["file_name"]
    }

@api_router.post("/media/{media_id}/delivered")
async def mark_media_delivered(media_id: str):
    """Mark media as delivered and delete from server"""
    result = await db.media.find_one_and_delete({"id": media_id})
    if not result:
        raise HTTPException(status_code=404, detail="Media not found")
    
    logger.info(f"Media {media_id} delivered and deleted from server")
    return {"status": "delivered", "media_id": media_id}

# ==================== WebSocket Endpoint ====================

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket connection for real-time message delivery"""
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle ping/pong for connection keep-alive
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(user_id)

# ==================== Health Check ====================

@api_router.get("/")
async def root():
    return {"message": "Secure Messenger API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
