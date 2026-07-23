# ============================================================
# messaging/websocket.py - WebSocket Connection Manager
# ============================================================
# Manages real-time WebSocket connections for chat messaging.
# JWT is passed as a query parameter for authentication.
#
# Usage in main.py:
#   from app.modules.messaging.websocket import websocket_endpoint
#   app.add_api_route("/ws/messages", websocket_endpoint)
# ============================================================

import json

from fastapi import WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.core.security import SECRET_KEY, ALGORITHM


class ConnectionManager:
    """Manages active WebSocket connections indexed by user_id."""

    def __init__(self):
        # user_id -> set of active WebSocket connections
        self.active_connections: dict[int, set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        print(f"[WS] User {user_id} connected. Total connections: {sum(len(v) for v in self.active_connections.values())}", flush=True)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        print(f"[WS] User {user_id} disconnected.", flush=True)

    async def broadcast_to_users(self, user_ids: list[int], message: dict):
        """Send a message to all active connections of the given users."""
        payload = json.dumps(message, default=str)
        for uid in user_ids:
            if uid in self.active_connections:
                dead = set()
                for ws in self.active_connections[uid]:
                    try:
                        await ws.send_text(payload)
                    except Exception:
                        dead.add(ws)
                # Clean up dead connections
                for ws in dead:
                    self.active_connections[uid].discard(ws)
                if not self.active_connections[uid]:
                    del self.active_connections[uid]


# Singleton connection manager
manager = ConnectionManager()


def _extract_user_id_from_token(token: str) -> int | None:
    """Validate JWT and extract user_id. Returns None if invalid."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            return None
        return int(user_id_str)
    except (JWTError, ValueError):
        return None


async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time messaging.

    Connect with: ws://<host>/ws/messages?token=<jwt>

    The server pushes new messages as JSON events:
    {
        "type": "new_message",
        "message": { ...MessageResponse fields... }
    }

    The client can also send a ping/keepalive:
    { "type": "ping" }
    Server responds: { "type": "pong" }
    """
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    user_id = _extract_user_id_from_token(token)
    if user_id is None:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await manager.connect(user_id, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            # Handle client-side ping/keepalive
            try:
                parsed = json.loads(data)
                if parsed.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception:
        manager.disconnect(user_id, websocket)
