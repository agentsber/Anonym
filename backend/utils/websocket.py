import logging
from datetime import datetime
from typing import Dict, Optional
from fastapi import WebSocket

from .database import db

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_last_seen: Dict[str, datetime] = {}
    
    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.user_last_seen[user_id] = datetime.utcnow()
        logger.info(f"User {user_id} connected via WebSocket")
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"is_online": True, "last_seen": datetime.utcnow()}}
        )
        await self.broadcast_status(user_id, True)
    
    async def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            self.user_last_seen[user_id] = datetime.utcnow()
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"is_online": False, "last_seen": datetime.utcnow()}}
            )
            logger.info(f"User {user_id} disconnected from WebSocket")
            await self.broadcast_status(user_id, False)
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to {user_id}: {e}")
                await self.disconnect(user_id)
    
    async def broadcast_status(self, user_id: str, online: bool):
        message = {
            "type": "status",
            "user_id": user_id,
            "online": online,
            "timestamp": datetime.utcnow().isoformat()
        }
        for uid, connection in list(self.active_connections.items()):
            if uid != user_id:
                try:
                    await connection.send_json(message)
                except:
                    pass
    
    def is_online(self, user_id: str) -> bool:
        return user_id in self.active_connections
    
    def get_last_seen(self, user_id: str) -> Optional[datetime]:
        return self.user_last_seen.get(user_id)

manager = ConnectionManager()
