from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    public_key: str
    identity_key: str
    signed_prekey: str
    prekey_signature: str


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


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    birthday: Optional[str] = None
    avatar_url: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class MessageSend(BaseModel):
    sender_id: str
    receiver_id: str
    encrypted_content: str
    ephemeral_key: str
    message_type: str = "text"
    reply_to_id: Optional[str] = None
    auto_delete_seconds: Optional[int] = None


class MessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    encrypted_content: str
    ephemeral_key: str
    message_type: str
    status: str
    timestamp: datetime
    reply_to_id: Optional[str] = None
    auto_delete_seconds: Optional[int] = None
    expires_at: Optional[datetime] = None


class MessageEdit(BaseModel):
    encrypted_content: str
    ephemeral_key: str


class GroupCreate(BaseModel):
    name: str
    creator_id: str
    description: Optional[str] = None
    member_ids: List[str] = []


class GroupResponse(BaseModel):
    id: str
    name: str
    creator_id: str
    description: Optional[str] = None
    members: List[str]
    created_at: datetime


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class GroupMessageSend(BaseModel):
    sender_id: str
    encrypted_content: str
    ephemeral_key: str
    message_type: str = "text"
    reply_to_id: Optional[str] = None
    auto_delete_seconds: Optional[int] = None


class GroupMessageResponse(BaseModel):
    id: str
    group_id: str
    sender_id: str
    encrypted_content: str
    ephemeral_key: str
    message_type: str
    timestamp: datetime
    reply_to_id: Optional[str] = None
    auto_delete_seconds: Optional[int] = None
    expires_at: Optional[datetime] = None
    edited: bool = False
    deleted: bool = False


class GroupMessageEdit(BaseModel):
    encrypted_content: str
    ephemeral_key: str


class GroupMemberUpdate(BaseModel):
    role: str = "member"


class GroupBanMember(BaseModel):
    reason: Optional[str] = None


class ForwardMessageRequest(BaseModel):
    message_id: str
    sender_id: str
    target_type: str
    target_id: str
    encrypted_content: str
    ephemeral_key: str
    original_sender_id: str
    original_timestamp: datetime
    message_type: str = "text"


class StickerPack(BaseModel):
    id: str
    name: str
    description: str
    preview_url: str
    stickers: List[dict]
    is_premium: bool = False


class VideoCreate(BaseModel):
    user_id: str
    description: Optional[str] = ""
    privacy: str = "public"
    video_data: str
    editor_metadata: Optional[str] = None


class VideoResponse(BaseModel):
    id: str
    user_id: str
    description: str
    privacy: str
    video_url: str
    likes: List[str]
    comments: List[dict]
    views: int
    created_at: datetime


class CallInitiate(BaseModel):
    caller_id: str
    callee_id: str
    call_type: str
    offer: str  # JSON string of SDP offer


class CallAnswer(BaseModel):
    call_id: str
    callee_id: str
    answer: str  # JSON string of SDP answer


class CallIceCandidate(BaseModel):
    call_id: str
    user_id: str
    candidate: str  # JSON string of ICE candidate


class CallAction(BaseModel):
    call_id: str
    user_id: str
    action: str


class AvatarUpload(BaseModel):
    user_id: str
    image_data: str


class VoiceUpload(BaseModel):
    sender_id: str
    duration: float
