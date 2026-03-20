import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from passlib.hash import bcrypt

from utils.database import db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Admin"])

ADMIN_USERNAME = "bardiyan"
ADMIN_PASSWORD_HASH = bcrypt.hash("AlexBsever15")


@router.get("/admin-panel", response_class=HTMLResponse)
async def admin_panel():
    """Admin panel"""
    users_count = await db.users.count_documents({})
    messages_count = await db.messages.count_documents({})
    groups_count = await db.groups.count_documents({})
    videos_count = await db.videos.count_documents({})
    
    html = f"""
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Private Admin Panel</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
                min-height: 100vh;
                color: #fff;
                padding: 20px;
            }}
            .container {{ max-width: 1200px; margin: 0 auto; }}
            h1 {{ 
                font-size: 2.5rem;
                margin-bottom: 30px;
                background: linear-gradient(90deg, #6C5CE7, #a29bfe);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }}
            .stats {{ 
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }}
            .stat-card {{
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 16px;
                padding: 24px;
                text-align: center;
            }}
            .stat-value {{
                font-size: 2.5rem;
                font-weight: 700;
                color: #6C5CE7;
            }}
            .stat-label {{
                font-size: 0.9rem;
                color: rgba(255,255,255,0.6);
                margin-top: 8px;
            }}
            .section {{
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 16px;
                padding: 24px;
                margin-bottom: 20px;
            }}
            h2 {{
                font-size: 1.3rem;
                margin-bottom: 16px;
                color: #a29bfe;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
            }}
            th, td {{
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid rgba(255,255,255,0.08);
            }}
            th {{ color: rgba(255,255,255,0.5); font-weight: 500; }}
            .online {{ color: #00b894; }}
            .offline {{ color: rgba(255,255,255,0.4); }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Private Admin Panel</h1>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-value">{users_count}</div>
                    <div class="stat-label">Пользователей</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{messages_count}</div>
                    <div class="stat-label">Сообщений</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{groups_count}</div>
                    <div class="stat-label">Групп</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{videos_count}</div>
                    <div class="stat-label">Видео</div>
                </div>
            </div>
            
            <div class="section">
                <h2>Последние пользователи</h2>
                <div id="users-list">Загрузка...</div>
            </div>
        </div>
        
        <script>
            fetch('/api/admin/users?limit=10')
                .then(r => r.json())
                .then(users => {{
                    const html = '<table><tr><th>Username</th><th>Email</th><th>Статус</th><th>Создан</th></tr>' +
                        users.map(u => `<tr>
                            <td>${{u.username}}</td>
                            <td>${{u.email}}</td>
                            <td class="${{u.is_online ? 'online' : 'offline'}}">${{u.is_online ? 'Online' : 'Offline'}}</td>
                            <td>${{new Date(u.created_at).toLocaleDateString('ru')}}</td>
                        </tr>`).join('') + '</table>';
                    document.getElementById('users-list').innerHTML = html;
                }});
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


@router.get("/admin/users")
async def get_admin_users(limit: int = 50, offset: int = 0):
    """Get users for admin"""
    users = await db.users.find({}, {
        "id": 1, "username": 1, "email": 1, "created_at": 1, "is_online": 1, "last_seen": 1
    }).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    return [{
        "id": u["id"],
        "username": u["username"],
        "email": u["email"],
        "is_online": u.get("is_online", False),
        "last_seen": u.get("last_seen", "").isoformat() if u.get("last_seen") else None,
        "created_at": u["created_at"].isoformat()
    } for u in users]


@router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin_key: str):
    """Delete user (admin only)"""
    if admin_key != "admin_secret_key":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.users.delete_one({"id": user_id})
    await db.messages.delete_many({"$or": [{"sender_id": user_id}, {"receiver_id": user_id}]})
    await db.contacts.delete_many({"$or": [{"user_id": user_id}, {"contact_id": user_id}]})
    
    return {"status": "deleted"}


@router.get("/admin/stats")
async def get_admin_stats():
    """Get admin statistics"""
    users = await db.users.count_documents({})
    online = await db.users.count_documents({"is_online": True})
    messages = await db.messages.count_documents({})
    groups = await db.groups.count_documents({})
    videos = await db.videos.count_documents({})
    
    return {
        "users": {"total": users, "online": online},
        "messages": messages,
        "groups": groups,
        "videos": videos,
        "timestamp": datetime.utcnow().isoformat()
    }
