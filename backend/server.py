from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime
import json
import base64
import hashlib
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# CORS middleware - must be added early
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root-level health check for Kubernetes (REQUIRED for deployment)
# Must be defined BEFORE any routers
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/")
async def root():
    return {"message": "Secure Messenger API", "status": "running"}

# Admin panel route
@app.get("/admin")
async def admin_panel():
    """Serve admin panel"""
    admin_path = Path("/app/admin/index.html")
    if admin_path.exists():
        return FileResponse(admin_path)
    return {"error": "Admin panel not found"}

# Admin panel via /api prefix (for ingress routing)
@app.get("/api/admin-panel")
async def admin_panel_api():
    """Serve admin panel via /api prefix"""
    admin_path = Path("/app/admin/index.html")
    if admin_path.exists():
        return FileResponse(admin_path)
    return {"error": "Admin panel not found"}

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== Models ====================

# Password hashing helper functions
def hash_password(password: str) -> str:
    """Hash password with salt using SHA-256"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{hashed}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash"""
    try:
        salt, hashed = stored_hash.split(':')
        return hashlib.sha256((password + salt).encode()).hexdigest() == hashed
    except:
        return False

class UserCreate(BaseModel):
    username: str
    email: str  # Email for login
    password: str  # Password for authentication
    public_key: str  # Base64 encoded public key
    identity_key: str  # Base64 encoded identity key for X3DH
    signed_prekey: str  # Base64 encoded signed prekey
    prekey_signature: str  # Base64 encoded signature

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
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

# ==================== Group Models ====================

class GroupCreate(BaseModel):
    name: str
    creator_id: str
    member_ids: List[str]  # List of user IDs to add to group
    avatar_color: Optional[str] = None

class GroupResponse(BaseModel):
    id: str
    name: str
    creator_id: str
    avatar_color: str
    created_at: datetime
    members: List[dict]

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    avatar_color: Optional[str] = None

class GroupMessageSend(BaseModel):
    group_id: str
    sender_id: str
    content: str  # Plain text for groups (simplified)
    message_type: str = "text"  # text, image, video, file
    reply_to_id: Optional[str] = None
    media_url: Optional[str] = None  # URL for media files

class GroupMessageResponse(BaseModel):
    id: str
    group_id: str
    sender_id: str
    sender_username: str
    content: str
    message_type: str
    timestamp: datetime
    reply_to_id: Optional[str] = None
    media_url: Optional[str] = None
    is_edited: bool = False
    is_pinned: bool = False

class GroupMessageEdit(BaseModel):
    content: str
    
class GroupMemberUpdate(BaseModel):
    role: str  # "admin" or "member"

class GroupBanMember(BaseModel):
    reason: Optional[str] = None

# ==================== Forward Message Models ====================

class ForwardMessageRequest(BaseModel):
    sender_id: str
    original_message_id: str
    original_message_type: str  # "direct" or "group"
    target_type: str  # "user" or "group"
    target_id: str  # user_id or group_id
    # For direct messages, we need encryption info
    encrypted_content: Optional[str] = None
    ephemeral_key: Optional[str] = None

# ==================== Sticker Models ====================

class StickerPack(BaseModel):
    id: str
    name: str
    stickers: List[str]  # List of sticker URLs/IDs

# Default sticker packs (emoji-based for simplicity)
DEFAULT_STICKER_PACKS = [
    {
        "id": "emotions",
        "name": "Эмоции",
        "stickers": ["😀", "😂", "🥰", "😍", "🤩", "😎", "🥳", "😢", "😭", "😤", "🤯", "🥺", "😱", "🤗", "🤔", "😴"]
    },
    {
        "id": "gestures",
        "name": "Жесты",
        "stickers": ["👍", "👎", "👋", "🤝", "🙏", "💪", "✌️", "🤞", "👊", "🤟", "👏", "🙌", "❤️", "💔", "💯", "🔥"]
    },
    {
        "id": "animals",
        "name": "Животные",
        "stickers": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔"]
    },
    {
        "id": "food",
        "name": "Еда",
        "stickers": ["🍕", "🍔", "🍟", "🌭", "🍿", "🧀", "🍳", "🥗", "🍜", "🍣", "🍰", "🎂", "🍩", "🍪", "☕", "🍺"]
    }
]

class MessageEdit(BaseModel):
    encrypted_content: str
    ephemeral_key: str

class LoginRequest(BaseModel):
    email: str
    password: str

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
    """Register a new user with email, password and public keys"""
    # Check if email already exists
    existing_email = await db.users.find_one({"email": user.email.lower()})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username already exists
    existing_user = await db.users.find_one({"username": user.username.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Validate username format
    if len(user.username) < 3 or len(user.username) > 30:
        raise HTTPException(status_code=400, detail="Username must be 3-30 characters")
    
    if not user.username.isalnum():
        raise HTTPException(status_code=400, detail="Username must be alphanumeric")
    
    # Validate password
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Validate email format (basic check)
    if '@' not in user.email or '.' not in user.email:
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "username": user.username.lower(),
        "email": user.email.lower(),
        "password_hash": hash_password(user.password),
        "public_key": user.public_key,
        "identity_key": user.identity_key,
        "signed_prekey": user.signed_prekey,
        "prekey_signature": user.prekey_signature,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_doc)
    logger.info(f"New user registered: {user.username} ({user.email})")
    
    return UserResponse(
        id=user_doc["id"],
        username=user_doc["username"],
        email=user_doc["email"],
        public_key=user_doc["public_key"],
        identity_key=user_doc["identity_key"],
        signed_prekey=user_doc["signed_prekey"],
        prekey_signature=user_doc["prekey_signature"],
        created_at=user_doc["created_at"]
    )

@api_router.post("/auth/login", response_model=UserResponse)
async def login_user(request: LoginRequest):
    """Login user by email and password"""
    user = await db.users.find_one({"email": request.email.lower()})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    logger.info(f"User logged in: {user['username']}")
    
    return UserResponse(
        id=user["id"],
        username=user["username"],
        email=user.get("email", ""),
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
    
    # Calculate expiration if auto-delete is set
    expires_at = None
    if message.auto_delete_seconds:
        from datetime import timedelta
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
                "timestamp": message_doc["timestamp"].isoformat(),
                "reply_to_id": message.reply_to_id,
                "auto_delete_seconds": message.auto_delete_seconds,
                "expires_at": expires_at.isoformat() if expires_at else None
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
        timestamp=message_doc["timestamp"],
        reply_to_id=message.reply_to_id,
        auto_delete_seconds=message.auto_delete_seconds,
        expires_at=expires_at
    )

@api_router.get("/messages/pending/{user_id}", response_model=List[MessageResponse])
async def get_pending_messages(user_id: str):
    """Get all pending messages for a user"""
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

@api_router.post("/messages/{message_id}/delivered")
async def mark_message_delivered(message_id: str):
    """Mark message as delivered and delete from server (relay complete)"""
    result = await db.messages.find_one_and_delete({"id": message_id})
    if not result:
        raise HTTPException(status_code=404, detail="Message not found")
    
    logger.info(f"Message {message_id} delivered and deleted from server")
    return {"status": "delivered", "message_id": message_id}

@api_router.post("/messages/{message_id}/read")
async def mark_message_read(message_id: str, reader_id: str):
    """Mark message as read and notify sender"""
    message = await db.messages.find_one({"id": message_id})
    if not message:
        # Message already delivered and deleted, but we can still notify
        pass
    
    # Notify sender that message was read
    if message and manager.is_online(message["sender_id"]):
        notification = {
            "type": "message_read",
            "message_id": message_id,
            "reader_id": reader_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        await manager.send_personal_message(notification, message["sender_id"])
    
    return {"status": "read", "message_id": message_id}

@api_router.put("/messages/{message_id}/edit")
async def edit_message(message_id: str, sender_id: str, edit_data: MessageEdit):
    """Edit a message (only sender can edit)"""
    message = await db.messages.find_one({"id": message_id, "sender_id": sender_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found or not authorized")
    
    await db.messages.update_one(
        {"id": message_id},
        {
            "$set": {
                "encrypted_content": edit_data.encrypted_content,
                "ephemeral_key": edit_data.ephemeral_key,
                "edited": True,
                "edited_at": datetime.utcnow()
            }
        }
    )
    
    # Notify receiver
    if manager.is_online(message["receiver_id"]):
        notification = {
            "type": "message_edited",
            "message_id": message_id,
            "sender_id": sender_id,
            "encrypted_content": edit_data.encrypted_content,
            "ephemeral_key": edit_data.ephemeral_key,
            "timestamp": datetime.utcnow().isoformat()
        }
        await manager.send_personal_message(notification, message["receiver_id"])
    
    return {"status": "edited", "message_id": message_id}

@api_router.delete("/messages/{message_id}")
async def delete_message(message_id: str, sender_id: str, for_everyone: bool = False):
    """Delete a message (only sender can delete for everyone)"""
    message = await db.messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if for_everyone:
        if message["sender_id"] != sender_id:
            raise HTTPException(status_code=403, detail="Only sender can delete for everyone")
        
        await db.messages.update_one(
            {"id": message_id},
            {"$set": {"deleted": True, "deleted_at": datetime.utcnow()}}
        )
        
        # Notify receiver
        if manager.is_online(message["receiver_id"]):
            notification = {
                "type": "message_deleted",
                "message_id": message_id,
                "sender_id": sender_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            await manager.send_personal_message(notification, message["receiver_id"])
    else:
        # Just mark as deleted locally (handled on client)
        pass
    
    return {"status": "deleted", "message_id": message_id, "for_everyone": for_everyone}

@api_router.get("/users/{user_id}/status")
async def get_user_status(user_id: str):
    """Get user online status"""
    online = manager.is_online(user_id)
    last_seen = manager.get_last_seen(user_id)
    
    return {
        "user_id": user_id,
        "online": online,
        "last_seen": last_seen.isoformat() if last_seen else None
    }

@api_router.get("/messages/history/{user_id}/{contact_id}", response_model=List[MessageResponse])
async def get_message_history(user_id: str, contact_id: str):
    """Get message history between two users (pending messages on server)"""
    messages = await db.messages.find({
        "$or": [
            {"sender_id": user_id, "receiver_id": contact_id},
            {"sender_id": contact_id, "receiver_id": user_id}
        ],
        "deleted": {"$ne": True}
    }).sort("timestamp", 1).to_list(1000)
    
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
    """Get all contacts for a user - optimized with aggregation"""
    # Use aggregation to avoid N+1 query pattern
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

# ==================== Group Endpoints ====================

@api_router.post("/groups", response_model=GroupResponse)
async def create_group(group: GroupCreate):
    """Create a new group chat"""
    # Verify at least one member is being added (besides creator)
    if not group.member_ids or len(group.member_ids) == 0:
        raise HTTPException(status_code=400, detail="Добавьте хотя бы одного участника в группу")
    
    # Verify creator exists
    creator = await db.users.find_one({"id": group.creator_id})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    # Generate group ID and avatar color
    group_id = str(uuid.uuid4())
    colors = ['#6C5CE7', '#00D9A5', '#FF6B6B', '#FDA7DF', '#1289A7', '#F79F1F']
    avatar_color = group.avatar_color or colors[len(group.name) % len(colors)]
    
    # Create group document
    group_doc = {
        "id": group_id,
        "name": group.name,
        "creator_id": group.creator_id,
        "avatar_color": avatar_color,
        "created_at": datetime.utcnow()
    }
    
    await db.groups.insert_one(group_doc)
    
    # Add creator as admin member
    await db.group_members.insert_one({
        "group_id": group_id,
        "user_id": group.creator_id,
        "role": "admin",
        "joined_at": datetime.utcnow()
    })
    
    # Add other members
    for member_id in group.member_ids:
        if member_id != group.creator_id:
            user = await db.users.find_one({"id": member_id})
            if user:
                await db.group_members.insert_one({
                    "group_id": group_id,
                    "user_id": member_id,
                    "role": "member",
                    "joined_at": datetime.utcnow()
                })
    
    # Get members list
    members = await get_group_members(group_id)
    
    logger.info(f"Group created: {group.name} by {creator['username']}")
    
    return GroupResponse(
        id=group_id,
        name=group.name,
        creator_id=group.creator_id,
        avatar_color=avatar_color,
        created_at=group_doc["created_at"],
        members=members
    )

async def get_group_members(group_id: str) -> List[dict]:
    """Get list of group members with user info"""
    pipeline = [
        {"$match": {"group_id": group_id}},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "id",
            "as": "user_info"
        }},
        {"$unwind": "$user_info"},
        {"$project": {
            "_id": 0,
            "user_id": 1,
            "username": "$user_info.username",
            "role": 1,
            "joined_at": 1
        }}
    ]
    members = await db.group_members.aggregate(pipeline).to_list(1000)
    # Convert joined_at to ISO string for JSON serialization
    for member in members:
        if "joined_at" in member and member["joined_at"]:
            member["joined_at"] = member["joined_at"].isoformat()
    return members

@api_router.get("/groups/{user_id}")
async def get_user_groups(user_id: str):
    """Get all groups for a user"""
    # Get group IDs user is member of
    memberships = await db.group_members.find({"user_id": user_id}).to_list(1000)
    group_ids = [m["group_id"] for m in memberships]
    
    groups = []
    for group_id in group_ids:
        group = await db.groups.find_one({"id": group_id})
        if group:
            members = await get_group_members(group_id)
            
            # Get last message
            last_message = await db.group_messages.find_one(
                {"group_id": group_id},
                sort=[("timestamp", -1)]
            )
            
            groups.append({
                "id": group["id"],
                "name": group["name"],
                "creator_id": group["creator_id"],
                "avatar_color": group["avatar_color"],
                "created_at": group["created_at"].isoformat(),
                "members": members,
                "member_count": len(members),
                "last_message": {
                    "content": last_message["content"] if last_message else None,
                    "sender_username": last_message.get("sender_username") if last_message else None,
                    "timestamp": last_message["timestamp"].isoformat() if last_message else None
                } if last_message else None
            })
    
    return groups

@api_router.get("/groups/{group_id}/info")
async def get_group_info(group_id: str):
    """Get group info by ID"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    members = await get_group_members(group_id)
    
    return {
        "id": group["id"],
        "name": group["name"],
        "creator_id": group["creator_id"],
        "avatar_color": group["avatar_color"],
        "created_at": group["created_at"].isoformat(),
        "members": members
    }

@api_router.put("/groups/{group_id}")
async def update_group(group_id: str, update: GroupUpdate, user_id: str):
    """Update group info (admin only)"""
    # Check if user is admin
    membership = await db.group_members.find_one({
        "group_id": group_id,
        "user_id": user_id,
        "role": "admin"
    })
    
    if not membership:
        raise HTTPException(status_code=403, detail="Only admins can update group")
    
    update_data = {}
    if update.name:
        update_data["name"] = update.name
    if update.avatar_color:
        update_data["avatar_color"] = update.avatar_color
    
    if update_data:
        await db.groups.update_one({"id": group_id}, {"$set": update_data})
    
    return {"status": "updated"}

@api_router.post("/groups/{group_id}/members/{member_id}")
async def add_group_member(group_id: str, member_id: str, admin_id: str):
    """Add member to group (admin only)"""
    # Check if requester is admin
    admin_membership = await db.group_members.find_one({
        "group_id": group_id,
        "user_id": admin_id,
        "role": "admin"
    })
    
    if not admin_membership:
        raise HTTPException(status_code=403, detail="Only admins can add members")
    
    # Check if user exists
    user = await db.users.find_one({"id": member_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already member
    existing = await db.group_members.find_one({
        "group_id": group_id,
        "user_id": member_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="User already in group")
    
    # Add member
    await db.group_members.insert_one({
        "group_id": group_id,
        "user_id": member_id,
        "role": "member",
        "joined_at": datetime.utcnow()
    })
    
    logger.info(f"User {user['username']} added to group {group_id}")
    return {"status": "added", "username": user["username"]}

@api_router.delete("/groups/{group_id}/members/{member_id}")
async def remove_group_member(group_id: str, member_id: str, admin_id: str):
    """Remove member from group (admin only, or self-leave)"""
    # Self-leave is allowed
    if member_id != admin_id:
        # Check if requester is admin
        admin_membership = await db.group_members.find_one({
            "group_id": group_id,
            "user_id": admin_id,
            "role": "admin"
        })
        
        if not admin_membership:
            raise HTTPException(status_code=403, detail="Only admins can remove members")
    
    # Can't remove the creator
    group = await db.groups.find_one({"id": group_id})
    if group and group["creator_id"] == member_id and member_id != admin_id:
        raise HTTPException(status_code=400, detail="Cannot remove group creator")
    
    result = await db.group_members.delete_one({
        "group_id": group_id,
        "user_id": member_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found in group")
    
    return {"status": "removed"}

@api_router.post("/groups/{group_id}/messages")
async def send_group_message(group_id: str, message: GroupMessageSend):
    """Send message to group"""
    # Verify sender is member and not banned
    membership = await db.group_members.find_one({
        "group_id": group_id,
        "user_id": message.sender_id
    })
    
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this group")
    
    # Check if user is banned
    ban = await db.group_bans.find_one({
        "group_id": group_id,
        "user_id": message.sender_id
    })
    if ban:
        raise HTTPException(status_code=403, detail="You are banned from this group")
    
    # Get sender info
    sender = await db.users.find_one({"id": message.sender_id})
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")
    
    message_id = str(uuid.uuid4())
    message_doc = {
        "id": message_id,
        "group_id": group_id,
        "sender_id": message.sender_id,
        "sender_username": sender["username"],
        "content": message.content,
        "message_type": message.message_type,
        "media_url": message.media_url,
        "timestamp": datetime.utcnow(),
        "reply_to_id": message.reply_to_id,
        "is_edited": False,
        "is_pinned": False,
        "is_deleted": False
    }
    
    await db.group_messages.insert_one(message_doc)
    
    # Notify all group members via WebSocket
    members = await db.group_members.find({"group_id": group_id}).to_list(1000)
    for member in members:
        if member["user_id"] != message.sender_id:
            await manager.send_personal_message({
                "type": "group_message",
                "group_id": group_id,
                "message": {
                    "id": message_id,
                    "sender_id": message.sender_id,
                    "sender_username": sender["username"],
                    "content": message.content,
                    "message_type": message.message_type,
                    "media_url": message.media_url,
                    "timestamp": message_doc["timestamp"].isoformat(),
                    "reply_to_id": message.reply_to_id,
                    "is_edited": False,
                    "is_pinned": False
                }
            }, member["user_id"])
    
    return {
        "id": message_id,
        "group_id": group_id,
        "sender_id": message.sender_id,
        "sender_username": sender["username"],
        "content": message.content,
        "message_type": message.message_type,
        "media_url": message.media_url,
        "timestamp": message_doc["timestamp"].isoformat(),
        "reply_to_id": message.reply_to_id,
        "is_edited": False,
        "is_pinned": False
    }

@api_router.get("/groups/{group_id}/messages")
async def get_group_messages(group_id: str, limit: int = 50, before: Optional[str] = None, search: Optional[str] = None):
    """Get messages from a group with optional search"""
    query = {"group_id": group_id, "is_deleted": {"$ne": True}}
    
    if before:
        query["timestamp"] = {"$lt": datetime.fromisoformat(before)}
    
    if search:
        query["content"] = {"$regex": search, "$options": "i"}
    
    messages = await db.group_messages.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return [{
        "id": m["id"],
        "group_id": m["group_id"],
        "sender_id": m["sender_id"],
        "sender_username": m.get("sender_username", "Unknown"),
        "content": m["content"],
        "message_type": m["message_type"],
        "media_url": m.get("media_url"),
        "timestamp": m["timestamp"].isoformat(),
        "reply_to_id": m.get("reply_to_id"),
        "is_edited": m.get("is_edited", False),
        "is_pinned": m.get("is_pinned", False)
    } for m in reversed(messages)]

# ==================== Edit/Delete Group Messages ====================

@api_router.put("/groups/{group_id}/messages/{message_id}")
async def edit_group_message(group_id: str, message_id: str, edit: GroupMessageEdit, user_id: str):
    """Edit a group message (sender only)"""
    message = await db.group_messages.find_one({"id": message_id, "group_id": group_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message["sender_id"] != user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own messages")
    
    await db.group_messages.update_one(
        {"id": message_id},
        {"$set": {"content": edit.content, "is_edited": True, "edited_at": datetime.utcnow()}}
    )
    
    # Notify group members
    members = await db.group_members.find({"group_id": group_id}).to_list(1000)
    for member in members:
        if member["user_id"] != user_id:
            await manager.send_personal_message({
                "type": "group_message_edited",
                "group_id": group_id,
                "message_id": message_id,
                "content": edit.content
            }, member["user_id"])
    
    return {"status": "edited"}

@api_router.delete("/groups/{group_id}/messages/{message_id}")
async def delete_group_message(group_id: str, message_id: str, user_id: str):
    """Delete a group message (sender or admin)"""
    message = await db.group_messages.find_one({"id": message_id, "group_id": group_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if user is sender or admin
    is_sender = message["sender_id"] == user_id
    membership = await db.group_members.find_one({"group_id": group_id, "user_id": user_id})
    is_admin = membership and membership.get("role") == "admin"
    
    if not is_sender and not is_admin:
        raise HTTPException(status_code=403, detail="Only sender or admin can delete messages")
    
    await db.group_messages.update_one(
        {"id": message_id},
        {"$set": {"is_deleted": True, "content": "Сообщение удалено", "deleted_at": datetime.utcnow()}}
    )
    
    # Notify group members
    members = await db.group_members.find({"group_id": group_id}).to_list(1000)
    for member in members:
        await manager.send_personal_message({
            "type": "group_message_deleted",
            "group_id": group_id,
            "message_id": message_id
        }, member["user_id"])
    
    return {"status": "deleted"}

# ==================== Pin Messages ====================

@api_router.post("/groups/{group_id}/messages/{message_id}/pin")
async def pin_group_message(group_id: str, message_id: str, user_id: str):
    """Pin a message (admin only)"""
    membership = await db.group_members.find_one({"group_id": group_id, "user_id": user_id})
    if not membership or membership.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can pin messages")
    
    message = await db.group_messages.find_one({"id": message_id, "group_id": group_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    await db.group_messages.update_one(
        {"id": message_id},
        {"$set": {"is_pinned": True, "pinned_by": user_id, "pinned_at": datetime.utcnow()}}
    )
    
    # Notify group members
    members = await db.group_members.find({"group_id": group_id}).to_list(1000)
    for member in members:
        await manager.send_personal_message({
            "type": "group_message_pinned",
            "group_id": group_id,
            "message_id": message_id
        }, member["user_id"])
    
    return {"status": "pinned"}

@api_router.delete("/groups/{group_id}/messages/{message_id}/pin")
async def unpin_group_message(group_id: str, message_id: str, user_id: str):
    """Unpin a message (admin only)"""
    membership = await db.group_members.find_one({"group_id": group_id, "user_id": user_id})
    if not membership or membership.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can unpin messages")
    
    await db.group_messages.update_one(
        {"id": message_id},
        {"$set": {"is_pinned": False}, "$unset": {"pinned_by": "", "pinned_at": ""}}
    )
    
    return {"status": "unpinned"}

@api_router.get("/groups/{group_id}/pinned")
async def get_pinned_messages(group_id: str):
    """Get all pinned messages in a group"""
    messages = await db.group_messages.find({
        "group_id": group_id,
        "is_pinned": True,
        "is_deleted": {"$ne": True}
    }).sort("pinned_at", -1).to_list(100)
    
    return [{
        "id": m["id"],
        "sender_id": m["sender_id"],
        "sender_username": m.get("sender_username", "Unknown"),
        "content": m["content"],
        "message_type": m["message_type"],
        "timestamp": m["timestamp"].isoformat(),
        "pinned_at": m.get("pinned_at", "").isoformat() if m.get("pinned_at") else None
    } for m in messages]

# ==================== Admin Management ====================

@api_router.put("/groups/{group_id}/members/{member_id}/role")
async def update_member_role(group_id: str, member_id: str, update: GroupMemberUpdate, admin_id: str):
    """Promote/demote member (admin only, can't demote creator)"""
    # Check if requester is admin
    admin_membership = await db.group_members.find_one({
        "group_id": group_id,
        "user_id": admin_id,
        "role": "admin"
    })
    if not admin_membership:
        raise HTTPException(status_code=403, detail="Only admins can change roles")
    
    # Can't change creator's role
    group = await db.groups.find_one({"id": group_id})
    if group and group["creator_id"] == member_id:
        raise HTTPException(status_code=400, detail="Cannot change creator's role")
    
    # Check if target member exists
    target_membership = await db.group_members.find_one({
        "group_id": group_id,
        "user_id": member_id
    })
    if not target_membership:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if update.role not in ["admin", "member"]:
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'member'")
    
    await db.group_members.update_one(
        {"group_id": group_id, "user_id": member_id},
        {"$set": {"role": update.role}}
    )
    
    return {"status": "updated", "new_role": update.role}

# ==================== Ban Management ====================

@api_router.post("/groups/{group_id}/ban/{member_id}")
async def ban_member(group_id: str, member_id: str, ban: GroupBanMember, admin_id: str):
    """Ban a member from group (admin only)"""
    # Check if requester is admin
    admin_membership = await db.group_members.find_one({
        "group_id": group_id,
        "user_id": admin_id,
        "role": "admin"
    })
    if not admin_membership:
        raise HTTPException(status_code=403, detail="Only admins can ban members")
    
    # Can't ban creator
    group = await db.groups.find_one({"id": group_id})
    if group and group["creator_id"] == member_id:
        raise HTTPException(status_code=400, detail="Cannot ban group creator")
    
    # Can't ban yourself
    if member_id == admin_id:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")
    
    # Remove from members
    await db.group_members.delete_one({
        "group_id": group_id,
        "user_id": member_id
    })
    
    # Add to ban list
    await db.group_bans.insert_one({
        "group_id": group_id,
        "user_id": member_id,
        "banned_by": admin_id,
        "reason": ban.reason,
        "banned_at": datetime.utcnow()
    })
    
    # Notify banned user
    await manager.send_personal_message({
        "type": "group_banned",
        "group_id": group_id,
        "reason": ban.reason
    }, member_id)
    
    return {"status": "banned"}

@api_router.delete("/groups/{group_id}/ban/{member_id}")
async def unban_member(group_id: str, member_id: str, admin_id: str):
    """Unban a member (admin only)"""
    # Check if requester is admin
    admin_membership = await db.group_members.find_one({
        "group_id": group_id,
        "user_id": admin_id,
        "role": "admin"
    })
    if not admin_membership:
        raise HTTPException(status_code=403, detail="Only admins can unban members")
    
    result = await db.group_bans.delete_one({
        "group_id": group_id,
        "user_id": member_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User is not banned")
    
    return {"status": "unbanned"}

@api_router.get("/groups/{group_id}/bans")
async def get_banned_members(group_id: str, admin_id: str):
    """Get list of banned members (admin only)"""
    # Check if requester is admin
    admin_membership = await db.group_members.find_one({
        "group_id": group_id,
        "user_id": admin_id,
        "role": "admin"
    })
    if not admin_membership:
        raise HTTPException(status_code=403, detail="Only admins can view ban list")
    
    bans = await db.group_bans.find({"group_id": group_id}).to_list(1000)
    
    result = []
    for ban in bans:
        user = await db.users.find_one({"id": ban["user_id"]})
        result.append({
            "user_id": ban["user_id"],
            "username": user["username"] if user else "Unknown",
            "reason": ban.get("reason"),
            "banned_at": ban["banned_at"].isoformat(),
            "banned_by": ban["banned_by"]
        })
    
    return result

# ==================== Search Messages ====================

@api_router.get("/groups/{group_id}/search")
async def search_group_messages(group_id: str, q: str, limit: int = 50):
    """Search messages in a group"""
    if not q or len(q) < 2:
        raise HTTPException(status_code=400, detail="Search query must be at least 2 characters")
    
    messages = await db.group_messages.find({
        "group_id": group_id,
        "content": {"$regex": q, "$options": "i"},
        "is_deleted": {"$ne": True}
    }).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return [{
        "id": m["id"],
        "sender_id": m["sender_id"],
        "sender_username": m.get("sender_username", "Unknown"),
        "content": m["content"],
        "message_type": m["message_type"],
        "timestamp": m["timestamp"].isoformat()
    } for m in messages]

@api_router.delete("/groups/{group_id}")
async def delete_group(group_id: str, user_id: str):
    """Delete group (creator only)"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group["creator_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only creator can delete group")
    
    # Delete all related data
    await db.group_messages.delete_many({"group_id": group_id})
    await db.group_members.delete_many({"group_id": group_id})
    await db.group_bans.delete_many({"group_id": group_id})
    await db.groups.delete_one({"id": group_id})
    
    logger.info(f"Group {group_id} deleted")
    return {"status": "deleted"}

# ==================== Forward Messages ====================

@api_router.post("/messages/forward")
async def forward_message(request: ForwardMessageRequest):
    """Forward a message to another user or group"""
    # Get sender info
    sender = await db.users.find_one({"id": request.sender_id})
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")
    
    # Get original message content
    original_content = ""
    original_sender_name = ""
    original_media_url = None
    original_message_type = "text"
    
    if request.original_message_type == "direct":
        # Get from direct messages
        original_msg = await db.messages.find_one({"id": request.original_message_id})
        if original_msg:
            original_content = original_msg.get("encrypted_content", "")
            original_sender = await db.users.find_one({"id": original_msg["sender_id"]})
            original_sender_name = original_sender["username"] if original_sender else "Unknown"
            original_message_type = original_msg.get("message_type", "text")
    else:
        # Get from group messages
        original_msg = await db.group_messages.find_one({"id": request.original_message_id})
        if original_msg:
            original_content = original_msg.get("content", "")
            original_sender_name = original_msg.get("sender_username", "Unknown")
            original_media_url = original_msg.get("media_url")
            original_message_type = original_msg.get("message_type", "text")
    
    if not original_msg:
        raise HTTPException(status_code=404, detail="Original message not found")
    
    message_id = str(uuid.uuid4())
    timestamp = datetime.utcnow()
    
    if request.target_type == "group":
        # Forward to group
        membership = await db.group_members.find_one({
            "group_id": request.target_id,
            "user_id": request.sender_id
        })
        if not membership:
            raise HTTPException(status_code=403, detail="You are not a member of this group")
        
        # Create forwarded message in group
        forwarded_content = original_content
        if request.original_message_type == "direct" and original_content:
            # For encrypted direct messages, we can't forward the actual content
            forwarded_content = f"[Пересланное сообщение от {original_sender_name}]"
        
        message_doc = {
            "id": message_id,
            "group_id": request.target_id,
            "sender_id": request.sender_id,
            "sender_username": sender["username"],
            "content": forwarded_content,
            "message_type": original_message_type,
            "media_url": original_media_url,
            "timestamp": timestamp,
            "is_forwarded": True,
            "forwarded_from": original_sender_name,
            "is_edited": False,
            "is_pinned": False,
            "is_deleted": False
        }
        
        await db.group_messages.insert_one(message_doc)
        
        # Notify group members
        members = await db.group_members.find({"group_id": request.target_id}).to_list(1000)
        for member in members:
            if member["user_id"] != request.sender_id:
                await manager.send_personal_message({
                    "type": "group_message",
                    "group_id": request.target_id,
                    "message": {
                        "id": message_id,
                        "sender_id": request.sender_id,
                        "sender_username": sender["username"],
                        "content": forwarded_content,
                        "message_type": original_message_type,
                        "media_url": original_media_url,
                        "timestamp": timestamp.isoformat(),
                        "is_forwarded": True,
                        "forwarded_from": original_sender_name
                    }
                }, member["user_id"])
        
        return {
            "status": "forwarded",
            "target_type": "group",
            "target_id": request.target_id,
            "message_id": message_id
        }
    else:
        # Forward to user (direct message)
        if not request.encrypted_content or not request.ephemeral_key:
            raise HTTPException(status_code=400, detail="Encrypted content required for direct messages")
        
        # Verify receiver exists
        receiver = await db.users.find_one({"id": request.target_id})
        if not receiver:
            raise HTTPException(status_code=404, detail="Receiver not found")
        
        message_doc = {
            "id": message_id,
            "sender_id": request.sender_id,
            "receiver_id": request.target_id,
            "encrypted_content": request.encrypted_content,
            "ephemeral_key": request.ephemeral_key,
            "message_type": original_message_type,
            "status": "pending",
            "timestamp": timestamp,
            "is_forwarded": True,
            "forwarded_from": original_sender_name
        }
        
        await db.messages.insert_one(message_doc)
        
        # Notify receiver via WebSocket
        await manager.send_personal_message({
            "type": "new_message",
            "message": {
                "id": message_id,
                "sender_id": request.sender_id,
                "encrypted_content": request.encrypted_content,
                "ephemeral_key": request.ephemeral_key,
                "message_type": original_message_type,
                "timestamp": timestamp.isoformat(),
                "is_forwarded": True,
                "forwarded_from": original_sender_name
            }
        }, request.target_id)
        
        return {
            "status": "forwarded",
            "target_type": "user",
            "target_id": request.target_id,
            "message_id": message_id
        }

@api_router.get("/forward/targets/{user_id}")
async def get_forward_targets(user_id: str):
    """Get list of contacts and groups where user can forward messages"""
    # Get contacts
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    contacts = []
    for contact_id in user.get("contacts", []):
        contact = await db.users.find_one({"id": contact_id})
        if contact:
            contacts.append({
                "type": "user",
                "id": contact["id"],
                "name": contact["username"],
                "avatar_letter": contact["username"][0].upper()
            })
    
    # Get groups
    groups = []
    memberships = await db.group_members.find({"user_id": user_id}).to_list(1000)
    for membership in memberships:
        group = await db.groups.find_one({"id": membership["group_id"]})
        if group:
            groups.append({
                "type": "group",
                "id": group["id"],
                "name": group["name"],
                "avatar_color": group.get("avatar_color", "#6C5CE7"),
                "member_count": await db.group_members.count_documents({"group_id": group["id"]})
            })
    
    return {
        "contacts": contacts,
        "groups": groups
    }

# ==================== Stickers API ====================

@api_router.get("/stickers/packs")
async def get_sticker_packs():
    """Get all available sticker packs"""
    return DEFAULT_STICKER_PACKS

@api_router.get("/stickers/packs/{pack_id}")
async def get_sticker_pack(pack_id: str):
    """Get specific sticker pack"""
    for pack in DEFAULT_STICKER_PACKS:
        if pack["id"] == pack_id:
            return pack
    raise HTTPException(status_code=404, detail="Sticker pack not found")

# ==================== Voice Messages API ====================

@api_router.post("/upload/voice")
async def upload_voice_message(
    file: UploadFile = File(...),
    sender_id: str = Form(...),
    duration: float = Form(...)
):
    """Upload a voice message file"""
    # Validate file type
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Must be audio.")
    
    # Read file content
    content = await file.read()
    
    # Generate unique file ID
    file_id = str(uuid.uuid4())
    
    # Store in database as base64 (for simplicity, in production use cloud storage)
    voice_doc = {
        "id": file_id,
        "sender_id": sender_id,
        "content_type": file.content_type,
        "data": base64.b64encode(content).decode('utf-8'),
        "duration": duration,
        "created_at": datetime.utcnow()
    }
    
    await db.voice_messages.insert_one(voice_doc)
    
    return {
        "id": file_id,
        "url": f"/api/voice/{file_id}",
        "duration": duration
    }

@api_router.get("/voice/{file_id}")
async def get_voice_message(file_id: str):
    """Get voice message file"""
    voice = await db.voice_messages.find_one({"id": file_id})
    if not voice:
        raise HTTPException(status_code=404, detail="Voice message not found")
    
    # Decode base64 content
    content = base64.b64decode(voice["data"])
    
    return Response(
        content=content,
        media_type=voice["content_type"],
        headers={"Content-Disposition": f'attachment; filename="voice_{file_id}.m4a"'}
    )

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

# ==================== API Health Check ====================

@api_router.get("/health")
async def api_health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ==================== Admin API ====================

# Admin credentials (in production, use environment variables)
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminToken(BaseModel):
    token: str
    expires_at: datetime

# Simple admin token storage (in production, use Redis or database)
admin_tokens: Dict[str, datetime] = {}

def generate_admin_token() -> str:
    return secrets.token_urlsafe(32)

def verify_admin_token(token: str) -> bool:
    if token in admin_tokens:
        if admin_tokens[token] > datetime.utcnow():
            return True
        else:
            del admin_tokens[token]
    return False

@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    """Admin login endpoint"""
    if credentials.username == ADMIN_USERNAME and credentials.password == ADMIN_PASSWORD:
        token = generate_admin_token()
        expires_at = datetime.utcnow() + timedelta(hours=24)
        admin_tokens[token] = expires_at
        return {"token": token, "expires_at": expires_at.isoformat()}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/admin/verify")
async def verify_admin(token: str):
    """Verify admin token"""
    if verify_admin_token(token):
        return {"valid": True}
    raise HTTPException(status_code=401, detail="Invalid or expired token")

@api_router.get("/admin/stats")
async def get_admin_stats(token: str):
    """Get system statistics"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Get counts
    users_count = await db.users.count_documents({})
    groups_count = await db.groups.count_documents({})
    messages_count = await db.messages.count_documents({})
    group_messages_count = await db.group_messages.count_documents({})
    
    # Get recent activity (last 24 hours)
    yesterday = datetime.utcnow() - timedelta(days=1)
    new_users_24h = await db.users.count_documents({"created_at": {"$gte": yesterday}})
    new_messages_24h = await db.messages.count_documents({"timestamp": {"$gte": yesterday}})
    new_group_messages_24h = await db.group_messages.count_documents({"timestamp": {"$gte": yesterday}})
    
    # Get last 7 days stats for chart
    daily_stats = []
    for i in range(7):
        day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        
        users = await db.users.count_documents({"created_at": {"$gte": day_start, "$lt": day_end}})
        messages = await db.messages.count_documents({"timestamp": {"$gte": day_start, "$lt": day_end}})
        
        daily_stats.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "users": users,
            "messages": messages
        })
    
    return {
        "total": {
            "users": users_count,
            "groups": groups_count,
            "direct_messages": messages_count,
            "group_messages": group_messages_count,
            "total_messages": messages_count + group_messages_count
        },
        "last_24h": {
            "new_users": new_users_24h,
            "new_messages": new_messages_24h + new_group_messages_24h
        },
        "daily_stats": list(reversed(daily_stats))
    }

@api_router.get("/admin/users")
async def get_admin_users(token: str, skip: int = 0, limit: int = 50):
    """Get all users for admin"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    users = await db.users.find({}, {"password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents({})
    
    result = []
    for user in users:
        # Get message count for this user
        msg_count = await db.messages.count_documents({
            "$or": [{"sender_id": user["id"]}, {"receiver_id": user["id"]}]
        })
        
        result.append({
            "id": user["id"],
            "username": user["username"],
            "email": user.get("email", "N/A"),
            "created_at": user["created_at"].isoformat() if "created_at" in user else "N/A",
            "last_seen": user.get("last_seen", user.get("created_at", datetime.utcnow())).isoformat() if user.get("last_seen") or user.get("created_at") else "N/A",
            "is_banned": user.get("is_banned", False),
            "message_count": msg_count
        })
    
    return {"users": result, "total": total}

@api_router.post("/admin/users/{user_id}/ban")
async def ban_user(user_id: str, token: str):
    """Ban a user"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_banned": True, "banned_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.info(f"User {user_id} banned by admin")
    return {"success": True, "message": f"User {user_id} has been banned"}

@api_router.post("/admin/users/{user_id}/unban")
async def unban_user(user_id: str, token: str):
    """Unban a user"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_banned": False}, "$unset": {"banned_at": ""}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.info(f"User {user_id} unbanned by admin")
    return {"success": True, "message": f"User {user_id} has been unbanned"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, token: str):
    """Delete a user and all their data"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Delete user
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete user's messages
    await db.messages.delete_many({"$or": [{"sender_id": user_id}, {"receiver_id": user_id}]})
    
    # Remove from groups
    await db.group_members.delete_many({"user_id": user_id})
    
    # Delete groups created by user
    await db.groups.delete_many({"creator_id": user_id})
    
    logger.info(f"User {user_id} deleted by admin")
    return {"success": True, "message": f"User {user_id} and all data deleted"}

@api_router.get("/admin/groups")
async def get_admin_groups(token: str, skip: int = 0, limit: int = 50):
    """Get all groups for admin"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    groups = await db.groups.find({}).skip(skip).limit(limit).to_list(limit)
    total = await db.groups.count_documents({})
    
    result = []
    for group in groups:
        member_count = await db.group_members.count_documents({"group_id": group["id"]})
        msg_count = await db.group_messages.count_documents({"group_id": group["id"]})
        
        result.append({
            "id": group["id"],
            "name": group["name"],
            "creator_id": group["creator_id"],
            "created_at": group["created_at"].isoformat(),
            "member_count": member_count,
            "message_count": msg_count
        })
    
    return {"groups": result, "total": total}

@api_router.delete("/admin/groups/{group_id}")
async def delete_group(group_id: str, token: str):
    """Delete a group"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Delete group
    result = await db.groups.delete_one({"id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Delete group members
    await db.group_members.delete_many({"group_id": group_id})
    
    # Delete group messages
    await db.group_messages.delete_many({"group_id": group_id})
    
    logger.info(f"Group {group_id} deleted by admin")
    return {"success": True, "message": f"Group {group_id} deleted"}

@api_router.get("/admin/logs")
async def get_admin_logs(token: str, limit: int = 100):
    """Get recent server logs"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Read last N lines from log file
    log_file = "/var/log/supervisor/backend.err.log"
    logs = []
    
    try:
        with open(log_file, 'r') as f:
            lines = f.readlines()
            logs = lines[-limit:] if len(lines) > limit else lines
    except Exception as e:
        logs = [f"Error reading logs: {str(e)}"]
    
    return {"logs": logs, "count": len(logs)}

@api_router.get("/admin/system")
async def get_system_info(token: str):
    """Get system information"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    import platform
    import psutil
    
    # Get system info
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    return {
        "system": {
            "platform": platform.system(),
            "python_version": platform.python_version(),
            "hostname": platform.node()
        },
        "cpu": {
            "percent": cpu_percent,
            "cores": psutil.cpu_count()
        },
        "memory": {
            "total_gb": round(memory.total / (1024**3), 2),
            "used_gb": round(memory.used / (1024**3), 2),
            "percent": memory.percent
        },
        "disk": {
            "total_gb": round(disk.total / (1024**3), 2),
            "used_gb": round(disk.used / (1024**3), 2),
            "percent": round(disk.percent, 1)
        },
        "database": {
            "name": os.environ['DB_NAME'],
            "status": "connected"
        }
    }

@api_router.post("/admin/backup")
async def create_backup(token: str):
    """Create database backup"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    import subprocess
    from datetime import datetime
    
    backup_dir = "/app/backups"
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_file = f"{backup_dir}/backup_{timestamp}.json"
    
    try:
        # Export collections to JSON
        backup_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "collections": {}
        }
        
        # Export users (without passwords)
        users = await db.users.find({}, {"password_hash": 0}).to_list(None)
        backup_data["collections"]["users"] = [
            {**u, "created_at": u["created_at"].isoformat(), "_id": str(u.get("_id", ""))} 
            for u in users
        ]
        
        # Export groups
        groups = await db.groups.find({}).to_list(None)
        backup_data["collections"]["groups"] = [
            {**g, "created_at": g["created_at"].isoformat(), "_id": str(g.get("_id", ""))} 
            for g in groups
        ]
        
        # Export group members
        members = await db.group_members.find({}).to_list(None)
        backup_data["collections"]["group_members"] = [
            {**m, "joined_at": m["joined_at"].isoformat() if "joined_at" in m else "", "_id": str(m.get("_id", ""))} 
            for m in members
        ]
        
        # Save to file
        with open(backup_file, 'w') as f:
            json.dump(backup_data, f, indent=2, default=str)
        
        logger.info(f"Backup created: {backup_file}")
        
        return {
            "success": True,
            "backup_file": backup_file,
            "timestamp": timestamp,
            "collections": list(backup_data["collections"].keys()),
            "sizes": {k: len(v) for k, v in backup_data["collections"].items()}
        }
    except Exception as e:
        logger.error(f"Backup failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

@api_router.get("/admin/backups")
async def list_backups(token: str):
    """List available backups"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    backup_dir = "/app/backups"
    backups = []
    
    if os.path.exists(backup_dir):
        for filename in os.listdir(backup_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(backup_dir, filename)
                stat = os.stat(filepath)
                backups.append({
                    "filename": filename,
                    "size_kb": round(stat.st_size / 1024, 2),
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
    
    return {"backups": sorted(backups, key=lambda x: x["created_at"], reverse=True)}

# Import timedelta for admin token expiration
from datetime import timedelta

# ==================== Server Management API ====================

@api_router.post("/admin/server/clear-cache")
async def clear_cache(token: str):
    """Clear server cache and temporary files"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    import shutil
    import gc
    
    cleared_items = []
    
    try:
        # Clear Python garbage collector
        gc.collect()
        cleared_items.append("Python GC collected")
        
        # Clear pycache
        pycache_dir = Path("/app/backend/__pycache__")
        if pycache_dir.exists():
            shutil.rmtree(pycache_dir)
            cleared_items.append("__pycache__ cleared")
        
        # Clear temp files older than 24h
        temp_dir = Path("/tmp")
        import time
        cutoff = time.time() - 86400  # 24 hours
        temp_cleared = 0
        for f in temp_dir.glob("*"):
            try:
                if f.is_file() and f.stat().st_mtime < cutoff:
                    f.unlink()
                    temp_cleared += 1
            except:
                pass
        if temp_cleared > 0:
            cleared_items.append(f"{temp_cleared} temp files cleared")
        
        logger.info(f"Cache cleared: {cleared_items}")
        return {"success": True, "cleared": cleared_items}
    except Exception as e:
        logger.error(f"Clear cache error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/server/cleanup-db")
async def cleanup_database(token: str):
    """Clean up database (remove orphaned data, expired sessions)"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    cleanup_results = {}
    
    try:
        # Remove expired admin tokens
        expired_count = 0
        current_time = datetime.utcnow()
        expired_tokens = [t for t, exp in admin_tokens.items() if exp < current_time]
        for t in expired_tokens:
            del admin_tokens[t]
            expired_count += 1
        cleanup_results["expired_tokens"] = expired_count
        
        # Remove messages older than 30 days for disappearing chats
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        deleted_msgs = await db.messages.delete_many({
            "disappear_after": {"$exists": True, "$ne": None},
            "timestamp": {"$lt": thirty_days_ago}
        })
        cleanup_results["expired_messages"] = deleted_msgs.deleted_count
        
        # Remove orphaned group members (groups that no longer exist)
        all_group_ids = [g["id"] async for g in db.groups.find({}, {"id": 1})]
        orphaned = await db.group_members.delete_many({
            "group_id": {"$nin": all_group_ids}
        })
        cleanup_results["orphaned_members"] = orphaned.deleted_count
        
        # Get database stats
        stats = await db.command("dbStats")
        cleanup_results["db_size_mb"] = round(stats.get("dataSize", 0) / (1024 * 1024), 2)
        
        logger.info(f"Database cleanup completed: {cleanup_results}")
        return {"success": True, "cleanup": cleanup_results}
    except Exception as e:
        logger.error(f"Database cleanup error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/server/processes")
async def get_processes(token: str):
    """Get running processes info"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    import psutil
    
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']):
        try:
            info = proc.info
            if info['cpu_percent'] > 0 or info['memory_percent'] > 0.1:
                processes.append({
                    "pid": info['pid'],
                    "name": info['name'],
                    "cpu_percent": round(info['cpu_percent'], 1),
                    "memory_percent": round(info['memory_percent'], 1),
                    "status": info['status']
                })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    
    # Sort by CPU usage
    processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
    
    return {"processes": processes[:20]}  # Top 20 processes

@api_router.get("/admin/server/connections")
async def get_connections(token: str):
    """Get active network connections and WebSocket info"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    import psutil
    
    # Get network connections
    connections = []
    for conn in psutil.net_connections(kind='inet'):
        if conn.status == 'ESTABLISHED':
            connections.append({
                "local": f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else "N/A",
                "remote": f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else "N/A",
                "status": conn.status
            })
    
    # Get WebSocket connections count
    ws_count = len(connected_clients) if 'connected_clients' in dir() else 0
    
    return {
        "network_connections": len(connections),
        "websocket_connections": ws_count,
        "active_calls": len(active_calls) if 'active_calls' in dir() else 0,
        "connections": connections[:50]  # First 50
    }

@api_router.get("/admin/server/uptime")
async def get_uptime(token: str):
    """Get server uptime and boot time"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    import psutil
    
    boot_time = datetime.fromtimestamp(psutil.boot_time())
    uptime = datetime.utcnow() - boot_time
    
    days = uptime.days
    hours, remainder = divmod(uptime.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    
    return {
        "boot_time": boot_time.isoformat(),
        "uptime_seconds": int(uptime.total_seconds()),
        "uptime_formatted": f"{days}д {hours}ч {minutes}м {seconds}с",
        "days": days,
        "hours": hours,
        "minutes": minutes
    }

@api_router.get("/admin/db/stats")
async def get_db_stats(token: str):
    """Get detailed database statistics"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        db_stats = await db.command("dbStats")
        
        # Get collection sizes
        collections_info = []
        for coll_name in await db.list_collection_names():
            coll_stats = await db.command("collStats", coll_name)
            collections_info.append({
                "name": coll_name,
                "count": coll_stats.get("count", 0),
                "size_kb": round(coll_stats.get("size", 0) / 1024, 2),
                "indexes": coll_stats.get("nindexes", 0)
            })
        
        collections_info.sort(key=lambda x: x["size_kb"], reverse=True)
        
        return {
            "database": os.environ['DB_NAME'],
            "size_mb": round(db_stats.get("dataSize", 0) / (1024 * 1024), 2),
            "storage_mb": round(db_stats.get("storageSize", 0) / (1024 * 1024), 2),
            "collections_count": db_stats.get("collections", 0),
            "indexes_count": db_stats.get("indexes", 0),
            "collections": collections_info
        }
    except Exception as e:
        logger.error(f"DB stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/db/compact")
async def compact_database(token: str):
    """Compact database collections to reclaim space"""
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        results = []
        for coll_name in await db.list_collection_names():
            try:
                before_stats = await db.command("collStats", coll_name)
                await db.command("compact", coll_name)
                after_stats = await db.command("collStats", coll_name)
                
                saved = before_stats.get("storageSize", 0) - after_stats.get("storageSize", 0)
                results.append({
                    "collection": coll_name,
                    "saved_kb": round(saved / 1024, 2)
                })
            except Exception as e:
                results.append({
                    "collection": coll_name,
                    "error": str(e)
                })
        
        logger.info(f"Database compact completed: {results}")
        return {"success": True, "results": results}
    except Exception as e:
        logger.error(f"Compact error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Video Call (WebRTC) Models ====================

class CallOffer(BaseModel):
    caller_id: str
    callee_id: str
    offer: str  # SDP offer (JSON string)
    call_type: str = "video"  # video or audio

class CallAnswer(BaseModel):
    call_id: str
    answer: str  # SDP answer (JSON string)

class IceCandidate(BaseModel):
    call_id: str
    user_id: str
    candidate: str  # ICE candidate (JSON string)

class CallAction(BaseModel):
    call_id: str
    user_id: str
    action: str  # "accept", "reject", "end", "toggle_video", "toggle_audio", "switch_camera"

# Active calls storage
active_calls: Dict[str, dict] = {}

# ==================== Video Call Endpoints ====================

@api_router.post("/calls/initiate")
async def initiate_call(offer: CallOffer):
    """Initiate a video/audio call"""
    # Verify both users exist
    caller = await db.users.find_one({"id": offer.caller_id})
    callee = await db.users.find_one({"id": offer.callee_id})
    
    if not caller or not callee:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if callee is online
    if not manager.is_online(offer.callee_id):
        raise HTTPException(status_code=400, detail="User is offline")
    
    # Check if either user is already in a call
    for call_id, call in active_calls.items():
        if call["status"] == "active":
            if offer.caller_id in [call["caller_id"], call["callee_id"]]:
                raise HTTPException(status_code=400, detail="You are already in a call")
            if offer.callee_id in [call["caller_id"], call["callee_id"]]:
                raise HTTPException(status_code=400, detail="User is busy")
    
    call_id = str(uuid.uuid4())
    call_doc = {
        "id": call_id,
        "caller_id": offer.caller_id,
        "caller_username": caller["username"],
        "callee_id": offer.callee_id,
        "callee_username": callee["username"],
        "call_type": offer.call_type,
        "offer": offer.offer,
        "answer": None,
        "status": "ringing",  # ringing, active, ended, rejected
        "started_at": datetime.utcnow(),
        "ended_at": None,
        "ice_candidates": {"caller": [], "callee": []}
    }
    
    active_calls[call_id] = call_doc
    
    # Store in database for history
    await db.calls.insert_one(call_doc.copy())
    
    # Notify callee about incoming call
    await manager.send_personal_message({
        "type": "incoming_call",
        "call_id": call_id,
        "caller_id": offer.caller_id,
        "caller_username": caller["username"],
        "call_type": offer.call_type,
        "offer": offer.offer
    }, offer.callee_id)
    
    logger.info(f"Call initiated: {call_id} from {caller['username']} to {callee['username']}")
    
    return {
        "call_id": call_id,
        "status": "ringing",
        "callee_username": callee["username"]
    }

@api_router.post("/calls/answer")
async def answer_call(answer: CallAnswer):
    """Answer a call with SDP answer"""
    if answer.call_id not in active_calls:
        raise HTTPException(status_code=404, detail="Call not found")
    
    call = active_calls[answer.call_id]
    
    if call["status"] != "ringing":
        raise HTTPException(status_code=400, detail="Call is not ringing")
    
    call["answer"] = answer.answer
    call["status"] = "active"
    call["connected_at"] = datetime.utcnow()
    
    # Update in database
    await db.calls.update_one(
        {"id": answer.call_id},
        {"$set": {"answer": answer.answer, "status": "active", "connected_at": datetime.utcnow()}}
    )
    
    # Notify caller that call was answered
    await manager.send_personal_message({
        "type": "call_answered",
        "call_id": answer.call_id,
        "answer": answer.answer
    }, call["caller_id"])
    
    logger.info(f"Call answered: {answer.call_id}")
    
    return {"status": "connected", "call_id": answer.call_id}

@api_router.post("/calls/ice-candidate")
async def add_ice_candidate(candidate: IceCandidate):
    """Add ICE candidate for call connection"""
    if candidate.call_id not in active_calls:
        raise HTTPException(status_code=404, detail="Call not found")
    
    call = active_calls[candidate.call_id]
    
    # Determine who sent the candidate and who should receive it
    if candidate.user_id == call["caller_id"]:
        call["ice_candidates"]["caller"].append(candidate.candidate)
        target_id = call["callee_id"]
    else:
        call["ice_candidates"]["callee"].append(candidate.candidate)
        target_id = call["caller_id"]
    
    # Forward ICE candidate to the other party
    await manager.send_personal_message({
        "type": "ice_candidate",
        "call_id": candidate.call_id,
        "candidate": candidate.candidate
    }, target_id)
    
    return {"status": "sent"}

@api_router.post("/calls/action")
async def call_action(action: CallAction):
    """Handle call actions: reject, end, toggle_video, toggle_audio"""
    if action.call_id not in active_calls:
        # Check database for ended calls
        call_in_db = await db.calls.find_one({"id": action.call_id})
        if not call_in_db:
            raise HTTPException(status_code=404, detail="Call not found")
        return {"status": "already_ended"}
    
    call = active_calls[action.call_id]
    
    if action.action == "reject":
        call["status"] = "rejected"
        call["ended_at"] = datetime.utcnow()
        
        # Update database
        await db.calls.update_one(
            {"id": action.call_id},
            {"$set": {"status": "rejected", "ended_at": datetime.utcnow()}}
        )
        
        # Notify caller
        await manager.send_personal_message({
            "type": "call_rejected",
            "call_id": action.call_id
        }, call["caller_id"])
        
        # Remove from active calls
        del active_calls[action.call_id]
        
        logger.info(f"Call rejected: {action.call_id}")
        return {"status": "rejected"}
    
    elif action.action == "end":
        call["status"] = "ended"
        call["ended_at"] = datetime.utcnow()
        
        # Calculate duration
        duration = 0
        if call.get("connected_at"):
            duration = (call["ended_at"] - call["connected_at"]).total_seconds()
        
        # Update database
        await db.calls.update_one(
            {"id": action.call_id},
            {"$set": {"status": "ended", "ended_at": datetime.utcnow(), "duration": duration}}
        )
        
        # Notify other party
        other_party = call["callee_id"] if action.user_id == call["caller_id"] else call["caller_id"]
        await manager.send_personal_message({
            "type": "call_ended",
            "call_id": action.call_id,
            "duration": duration
        }, other_party)
        
        # Remove from active calls
        del active_calls[action.call_id]
        
        logger.info(f"Call ended: {action.call_id}, duration: {duration}s")
        return {"status": "ended", "duration": duration}
    
    elif action.action in ["toggle_video", "toggle_audio", "switch_camera"]:
        # Notify other party about media state change
        other_party = call["callee_id"] if action.user_id == call["caller_id"] else call["caller_id"]
        await manager.send_personal_message({
            "type": "call_media_update",
            "call_id": action.call_id,
            "action": action.action,
            "user_id": action.user_id
        }, other_party)
        
        return {"status": "updated", "action": action.action}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

@api_router.get("/calls/history/{user_id}")
async def get_call_history(user_id: str, limit: int = 50):
    """Get call history for a user"""
    calls = await db.calls.find({
        "$or": [{"caller_id": user_id}, {"callee_id": user_id}]
    }).sort("started_at", -1).limit(limit).to_list(limit)
    
    result = []
    for call in calls:
        is_caller = call["caller_id"] == user_id
        other_user = call["callee_username"] if is_caller else call["caller_username"]
        
        result.append({
            "id": call["id"],
            "other_user": other_user,
            "other_user_id": call["callee_id"] if is_caller else call["caller_id"],
            "call_type": call.get("call_type", "video"),
            "is_outgoing": is_caller,
            "status": call["status"],
            "duration": call.get("duration", 0),
            "started_at": call["started_at"].isoformat() if call.get("started_at") else None,
            "ended_at": call["ended_at"].isoformat() if call.get("ended_at") else None
        })
    
    return result

@api_router.get("/calls/active/{user_id}")
async def get_active_call(user_id: str):
    """Check if user has an active call"""
    for call_id, call in active_calls.items():
        if call["status"] in ["ringing", "active"]:
            if user_id in [call["caller_id"], call["callee_id"]]:
                return {
                    "has_active_call": True,
                    "call_id": call_id,
                    "status": call["status"],
                    "call_type": call.get("call_type", "video"),
                    "is_caller": call["caller_id"] == user_id,
                    "other_user": call["callee_username"] if call["caller_id"] == user_id else call["caller_username"]
                }
    
    return {"has_active_call": False}

# Include the router in the main app
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
