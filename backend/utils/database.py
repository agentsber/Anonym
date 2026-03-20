import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

async def create_indexes():
    """Create database indexes for performance"""
    try:
        await db.users.create_index("id", unique=True)
        await db.users.create_index("username", unique=True)
        await db.users.create_index("email", unique=True)
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")

    try:
        await db.messages.create_index([("sender_id", 1), ("receiver_id", 1)])
        await db.messages.create_index([("receiver_id", 1), ("status", 1)])
        await db.messages.create_index("timestamp")
        logger.info("Message indexes created successfully")
    except Exception as e:
        logger.warning(f"Message index warning: {e}")

    try:
        await db.contacts.create_index([("user_id", 1), ("contact_id", 1)], unique=True)
        await db.groups.create_index("id", unique=True)
        await db.group_messages.create_index([("group_id", 1), ("timestamp", -1)])
        await db.videos.create_index([("user_id", 1), ("created_at", -1)])
        await db.videos.create_index("created_at")
        logger.info("Additional indexes created successfully")
    except Exception as e:
        logger.warning(f"Additional index warning: {e}")
