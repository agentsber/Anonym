"""
Private Messenger API Server
Modular FastAPI backend with routers
"""

import logging
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from utils.database import db, create_indexes
from utils.websocket import manager

from routes import (
    auth_router,
    users_router,
    messages_router,
    contacts_router,
    media_router,
    videos_router,
    calls_router,
    groups_router,
    notifications_router,
    admin_router,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown events"""
    logger.info("Starting Private Messenger API...")
    await create_indexes()
    logger.info("Server started successfully")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Private Messenger API",
    description="Secure messaging backend with E2E encryption",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")


@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# Include all routers
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(messages_router)
api_router.include_router(contacts_router)
api_router.include_router(media_router)
api_router.include_router(videos_router)
api_router.include_router(calls_router)
api_router.include_router(groups_router)
api_router.include_router(notifications_router)
api_router.include_router(admin_router)

app.include_router(api_router)


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time communication"""
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "typing":
                target_id = data.get("target_id")
                if target_id and manager.is_online(target_id):
                    await manager.send_personal_message({
                        "type": "typing",
                        "user_id": user_id,
                        "timestamp": datetime.utcnow().isoformat()
                    }, target_id)
            
            elif data.get("type") == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat()
                })
    
    except WebSocketDisconnect:
        await manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"WebSocket error for {user_id}: {e}")
        await manager.disconnect(user_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
