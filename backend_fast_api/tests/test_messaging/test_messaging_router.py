# ============================================================
# tests/test_messaging/test_messaging_router.py
# ============================================================
# Covers all implemented REST endpoints in messaging/router.py:
#
#   GET  /api/messages/contacts/search      — search_org_contacts
#   GET  /api/messages/threads              — list_user_threads
#   POST /api/messages/threads/dm           — get_or_create_dm_thread
#   GET  /api/messages/threads/{thread_id}  — get_thread_messages
#   POST /api/messages/threads/{thread_id}  — send_message (+WS broadcast)
#   PUT  /api/messages/threads/{thread_id}/read — mark_thread_read
#
# NOTE on send_message tests:
#   The route has response_model=MessageResponse, so FastAPI validates the
#   return value through Pydantic. mock_send must return a real
#   MessageResponse instance — a plain dict or MagicMock will fail
#   response serialization with a ResponseValidationError.
#
# All endpoints use Depends(get_current_user_org) — overridden via
# app.dependency_overrides in each test class.
#
# send_message also calls manager.broadcast_to_users; that is patched
# to avoid spinning up real WebSocket connections.
# ============================================================

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import HTTPException
from app.modules.messaging.schemas import MessageResponse

from app.main import app
from app.modules.auth.dependencies import get_current_user_org


# ---------------------------------------------------------------------------
# Helpers & shared fixtures
# ---------------------------------------------------------------------------

def _mock_db_ctx(mock_conn):
    """Wrap a mock asyncpg connection as an async context manager."""
    @asynccontextmanager
    async def _ctx():
        yield mock_conn
    return _ctx


def _user_org(user_id: int = 1, org_id: int = 10, org_user_id: int = 1):
    return {
        "user_id": user_id,
        "email": "user@test.com",
        "organization_id": org_id,
        "role_in_org": "Owner",
        "org_user_id": org_user_id,
    }


def _now():
    return datetime.now(timezone.utc)


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


# ===========================================================================
# GET /api/messages/contacts/search?q=...
# ===========================================================================

class TestContactSearch:
    """Tests for the intra-org contact search endpoint."""

    # ── Happy path ──────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.search_org_contacts")
    async def test_search_returns_matching_contacts(self, mock_search, mock_db, client):
        """Valid query → list of ContactSearchResult."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_search.return_value = [
            {"user_id": 2, "full_name": "Alice", "email": "alice@test.com", "role_in_org": "Viewer"},
        ]

        resp = await client.get("/api/messages/contacts/search?q=alice")

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["full_name"] == "Alice"
        assert data[0]["email"] == "alice@test.com"

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.search_org_contacts")
    async def test_search_returns_empty_when_no_match(self, mock_search, mock_db, client):
        """No matching contacts → empty list, not an error."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_search.return_value = []

        resp = await client.get("/api/messages/contacts/search?q=zzznobody")

        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.search_org_contacts")
    async def test_search_passes_user_and_org_to_service(self, mock_search, mock_db, client):
        """Service must receive the caller's user_id and organization_id."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org(user_id=5, org_id=99)
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_search.return_value = []

        await client.get("/api/messages/contacts/search?q=bob")

        mock_search.assert_called_once()
        kwargs = mock_search.call_args.kwargs
        assert kwargs["user_id"] == 5
        assert kwargs["organization_id"] == 99
        assert kwargs["query"] == "bob"

    # ── Auth ─────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_search_requires_auth(self, client):
        """No auth token → 401."""
        resp = await client.get("/api/messages/contacts/search?q=alice")
        assert resp.status_code == 401

    # ── Input validation ─────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_search_missing_q_param_returns_422(self, client):
        """q parameter is required (min_length=1) → 422 without it."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        resp = await client.get("/api/messages/contacts/search")
        assert resp.status_code == 422


# ===========================================================================
# GET /api/messages/threads
# ===========================================================================

class TestListThreads:
    """Tests for the thread listing endpoint."""

    # ── Happy path ──────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.list_user_threads")
    async def test_list_threads_returns_user_threads(self, mock_list, mock_db, client):
        """Authenticated user gets their thread list."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_list.return_value = [
            {
                "thread_id": 1,
                "thread_type": "IntraCompany",
                "group_name": None,
                "participants": [{"user_id": 1, "full_name": "Me"}, {"user_id": 2, "full_name": "Alice"}],
                "last_message_preview": "Hello there",
                "last_message_time": _now(),
                "unread_count": 2,
            }
        ]

        resp = await client.get("/api/messages/threads")

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["thread_id"] == 1
        assert data[0]["thread_type"] == "IntraCompany"
        assert data[0]["unread_count"] == 2

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.list_user_threads")
    async def test_list_threads_returns_empty_when_no_threads(self, mock_list, mock_db, client):
        """User with no threads → empty list."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_list.return_value = []

        resp = await client.get("/api/messages/threads")

        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.list_user_threads")
    async def test_list_threads_passes_user_id_to_service(self, mock_list, mock_db, client):
        """Service is called with the caller's user_id."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org(user_id=7)
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_list.return_value = []

        await client.get("/api/messages/threads")

        mock_list.assert_called_once()
        assert mock_list.call_args.kwargs["user_id"] == 7

    # ── Auth ─────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_list_threads_requires_auth(self, client):
        resp = await client.get("/api/messages/threads")
        assert resp.status_code == 401


# ===========================================================================
# POST /api/messages/threads/dm
# ===========================================================================

class TestCreateDmThread:
    """Tests for the 1:1 intra-company DM thread creation endpoint."""

    # ── Happy path ──────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.get_or_create_dm_thread")
    async def test_create_dm_thread_new(self, mock_create, mock_db, client):
        """First DM with a user → is_new=True, thread_id returned."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_create.return_value = {"thread_id": 42, "is_new": True}

        resp = await client.post(
            "/api/messages/threads/dm",
            json={"participant_user_id": 2},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["thread_id"] == 42
        assert data["is_new"] is True

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.get_or_create_dm_thread")
    async def test_create_dm_thread_existing_returns_is_new_false(
        self, mock_create, mock_db, client
    ):
        """Existing DM thread → returned with is_new=False (idempotent)."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_create.return_value = {"thread_id": 7, "is_new": False}

        resp = await client.post(
            "/api/messages/threads/dm",
            json={"participant_user_id": 2},
        )

        assert resp.status_code == 200
        assert resp.json()["is_new"] is False
        assert resp.json()["thread_id"] == 7

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.get_or_create_dm_thread")
    async def test_create_dm_passes_correct_args_to_service(
        self, mock_create, mock_db, client
    ):
        """Service receives caller's user_id, org_id, and other_user_id from body."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org(user_id=3, org_id=20)
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_create.return_value = {"thread_id": 1, "is_new": True}

        await client.post(
            "/api/messages/threads/dm",
            json={"participant_user_id": 8},
        )

        mock_create.assert_called_once()
        kwargs = mock_create.call_args.kwargs
        assert kwargs["user_id"] == 3
        assert kwargs["organization_id"] == 20
        assert kwargs["other_user_id"] == 8

    # ── Business rule errors ─────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.get_or_create_dm_thread")
    async def test_create_dm_with_self_returns_400(self, mock_create, mock_db, client):
        """Cannot create a DM thread with yourself → 400."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org(user_id=1)
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_create.side_effect = HTTPException(
            status_code=400, detail="Cannot create a DM thread with yourself."
        )

        resp = await client.post(
            "/api/messages/threads/dm",
            json={"participant_user_id": 1},  # same as caller
        )

        assert resp.status_code == 400
        assert "yourself" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.get_or_create_dm_thread")
    async def test_create_dm_cross_org_returns_403(self, mock_create, mock_db, client):
        """Target user not in same org → 403."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_create.side_effect = HTTPException(
            status_code=403, detail="Target user is not in your organization."
        )

        resp = await client.post(
            "/api/messages/threads/dm",
            json={"participant_user_id": 999},
        )

        assert resp.status_code == 403
        assert "organization" in resp.json()["detail"].lower()

    # ── Input validation ─────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_create_dm_missing_participant_id_returns_422(self, client):
        """participant_user_id is required → 422."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        resp = await client.post("/api/messages/threads/dm", json={})
        assert resp.status_code == 422

    # ── Auth ─────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_create_dm_requires_auth(self, client):
        resp = await client.post("/api/messages/threads/dm", json={"participant_user_id": 2})
        assert resp.status_code == 401


# ===========================================================================
# GET /api/messages/threads/{thread_id}
# ===========================================================================

class TestGetThreadMessages:
    """Tests for the paginated message retrieval endpoint."""

    def _make_message(self, msg_id: int, text: str = "Hello") -> dict:
        return {
            "message_id": msg_id,
            "thread_id": 1,
            "sender_user_id": 2,
            "sender_name": "Alice",
            "message_text": text,
            "sent_at": _now(),
        }

    # ── Happy path ──────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.get_thread_messages")
    async def test_get_messages_returns_decrypted_messages(
        self, mock_get, mock_db, client
    ):
        """Participant gets paginated message list with decrypted text."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get.return_value = {
            "thread_id": 1,
            "messages": [
                self._make_message(1, "Hello"),
                self._make_message(2, "How are you?"),
            ],
            "has_more": False,
        }

        resp = await client.get("/api/messages/threads/1")

        assert resp.status_code == 200
        data = resp.json()
        assert data["thread_id"] == 1
        assert len(data["messages"]) == 2
        assert data["messages"][0]["message_text"] == "Hello"
        assert data["has_more"] is False

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.get_thread_messages")
    async def test_get_messages_has_more_true_when_more_pages(
        self, mock_get, mock_db, client
    ):
        """has_more=True when there are more pages of messages."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get.return_value = {
            "thread_id": 1,
            "messages": [self._make_message(i) for i in range(50)],
            "has_more": True,
        }

        resp = await client.get("/api/messages/threads/1")

        assert resp.status_code == 200
        assert resp.json()["has_more"] is True

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.get_thread_messages")
    async def test_get_messages_passes_pagination_params(
        self, mock_get, mock_db, client
    ):
        """limit and offset query params are forwarded to the service."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org(user_id=3)
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get.return_value = {"thread_id": 5, "messages": [], "has_more": False}

        await client.get("/api/messages/threads/5?limit=20&offset=40")

        mock_get.assert_called_once()
        kwargs = mock_get.call_args.kwargs
        assert kwargs["thread_id"] == 5
        assert kwargs["user_id"] == 3
        assert kwargs["limit"] == 20
        assert kwargs["offset"] == 40

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.get_thread_messages")
    async def test_get_messages_empty_thread(self, mock_get, mock_db, client):
        """Thread exists but has no messages → empty list, has_more=False."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get.return_value = {"thread_id": 1, "messages": [], "has_more": False}

        resp = await client.get("/api/messages/threads/1")

        assert resp.status_code == 200
        assert resp.json()["messages"] == []

    # ── Access control ───────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.get_thread_messages")
    async def test_non_participant_gets_403(self, mock_get, mock_db, client):
        """User not in thread_participants → 403."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org(user_id=99)
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_get.side_effect = HTTPException(
            status_code=403, detail="You are not a participant in this thread."
        )

        resp = await client.get("/api/messages/threads/1")

        assert resp.status_code == 403
        assert "participant" in resp.json()["detail"].lower()

    # ── Input validation ─────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_get_messages_invalid_thread_id_returns_422(self, client):
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        resp = await client.get("/api/messages/threads/not-a-number")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_get_messages_limit_out_of_range_returns_422(self, client):
        """limit must be 1–200 (ge=1, le=200); 0 is invalid."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        resp = await client.get("/api/messages/threads/1?limit=0")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_get_messages_negative_offset_returns_422(self, client):
        """offset must be >= 0."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        resp = await client.get("/api/messages/threads/1?offset=-1")
        assert resp.status_code == 422

    # ── Auth ─────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_get_messages_requires_auth(self, client):
        resp = await client.get("/api/messages/threads/1")
        assert resp.status_code == 401


# ===========================================================================
# POST /api/messages/threads/{thread_id}  — send_message
# ===========================================================================

class TestPostMessage:
    """
    Tests for the send-message endpoint.
    The endpoint also broadcasts to WebSocket connections —
    manager.broadcast_to_users and service.get_thread_participant_ids
    are both patched to keep tests in-process.
    """

    def _mock_broadcast(self):
        """Return a coroutine mock for manager.broadcast_to_users."""
        return AsyncMock()

    # ── Happy path ──────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.manager")
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.send_message")
    @patch("app.modules.messaging.service.get_thread_participant_ids")
    async def test_send_message_success(
        self, mock_participants, mock_send, mock_db, mock_manager, client
    ):
        """Authenticated participant sends a message → 200 with MessageResponse."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org(user_id=1)
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        # Must be a real MessageResponse — FastAPI validates against response_model
        mock_send.return_value = MessageResponse(
            message_id=55,
            thread_id=1,
            sender_user_id=1,
            sender_name="Test User",
            message_text="Hello!",
            sent_at=_now(),
        )
        mock_participants.return_value = [1, 2]
        mock_manager.broadcast_to_users = AsyncMock()

        resp = await client.post(
            "/api/messages/threads/1",
            json={"message_text": "Hello!"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["message_id"] == 55
        assert data["message_text"] == "Hello!"
        assert data["sender_user_id"] == 1

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.manager")
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.send_message")
    @patch("app.modules.messaging.service.get_thread_participant_ids")
    async def test_send_message_broadcasts_to_participants(
        self, mock_participants, mock_send, mock_db, mock_manager, client
    ):
        """After storing the message, broadcast is called with participant IDs."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org(user_id=1)
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        # Real MessageResponse so Pydantic serialization succeeds
        mock_send.return_value = MessageResponse(
            message_id=1,
            thread_id=1,
            sender_user_id=1,
            sender_name="Me",
            message_text="Hi",
            sent_at=_now(),
        )
        mock_participants.return_value = [1, 2, 3]
        mock_manager.broadcast_to_users = AsyncMock()

        await client.post(
            "/api/messages/threads/1",
            json={"message_text": "Hi"},
        )

        mock_manager.broadcast_to_users.assert_called_once()
        call_args = mock_manager.broadcast_to_users.call_args
        # First arg: participant list
        assert call_args.args[0] == [1, 2, 3]
        # Second arg: payload dict
        broadcast_payload = call_args.args[1]
        assert broadcast_payload["type"] == "new_message"

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.manager")
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.send_message")
    @patch("app.modules.messaging.service.get_thread_participant_ids")
    async def test_send_message_passes_correct_args_to_service(
        self, mock_participants, mock_send, mock_db, mock_manager, client
    ):
        """thread_id from URL and plaintext from body reach the service correctly."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org(user_id=5)
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_send.return_value = MessageResponse(
            message_id=1,
            thread_id=9,
            sender_user_id=5,
            sender_name="Test User",
            message_text="Test message",
            sent_at=_now(),
        )
        mock_participants.return_value = []
        mock_manager.broadcast_to_users = AsyncMock()

        await client.post(
            "/api/messages/threads/9",
            json={"message_text": "Test message"},
        )

        mock_send.assert_called_once()
        kwargs = mock_send.call_args.kwargs
        assert kwargs["thread_id"] == 9
        assert kwargs["user_id"] == 5
        assert kwargs["plaintext"] == "Test message"

    # ── Access control ───────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.manager")
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.send_message")
    @patch("app.modules.messaging.service.get_thread_participant_ids")
    async def test_non_participant_cannot_send_message(
        self, mock_participants, mock_send, mock_db, mock_manager, client
    ):
        """User not in thread_participants → service raises 403."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org(user_id=99)
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_send.side_effect = HTTPException(
            status_code=403, detail="You are not a participant in this thread."
        )
        mock_participants.return_value = []
        mock_manager.broadcast_to_users = AsyncMock()

        resp = await client.post(
            "/api/messages/threads/1",
            json={"message_text": "Sneaky message"},
        )

        assert resp.status_code == 403

    # ── Business rule errors ─────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.manager")
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.send_message")
    @patch("app.modules.messaging.service.get_thread_participant_ids")
    async def test_send_empty_message_returns_400(
        self, mock_participants, mock_send, mock_db, mock_manager, client
    ):
        """Service rejects empty/whitespace-only message_text → 400."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_send.side_effect = HTTPException(
            status_code=400, detail="Message cannot be empty."
        )
        mock_participants.return_value = []
        mock_manager.broadcast_to_users = AsyncMock()

        resp = await client.post(
            "/api/messages/threads/1",
            json={"message_text": "   "},
        )

        assert resp.status_code == 400
        assert "empty" in resp.json()["detail"].lower()

    # ── Input validation ─────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_send_message_missing_body_returns_422(self, client):
        """message_text is required → 422."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        resp = await client.post("/api/messages/threads/1", json={})
        assert resp.status_code == 422

    # ── Auth ─────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_send_message_requires_auth(self, client):
        resp = await client.post(
            "/api/messages/threads/1",
            json={"message_text": "Hi"},
        )
        assert resp.status_code == 401


# ===========================================================================
# PUT /api/messages/threads/{thread_id}/read
# ===========================================================================

class TestMarkRead:
    """Tests for the mark-thread-read endpoint."""

    # ── Happy path ──────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.mark_thread_read")
    async def test_mark_read_returns_ok(self, mock_mark, mock_db, client):
        """Participant marks thread as read → {"status": "ok"}."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org(user_id=1)
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_mark.return_value = None  # service returns None

        resp = await client.put("/api/messages/threads/1/read")

        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.mark_thread_read")
    async def test_mark_read_passes_correct_args(self, mock_mark, mock_db, client):
        """thread_id from URL and user_id from auth reach the service."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org(user_id=4)
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_mark.return_value = None

        await client.put("/api/messages/threads/7/read")

        mock_mark.assert_called_once()
        kwargs = mock_mark.call_args.kwargs
        assert kwargs["thread_id"] == 7
        assert kwargs["user_id"] == 4

    @pytest.mark.asyncio
    @patch("app.modules.messaging.router.get_db_connection")
    @patch("app.modules.messaging.service.mark_thread_read")
    async def test_mark_read_is_idempotent(self, mock_mark, mock_db, client):
        """Calling mark_read twice is safe (UPDATE is idempotent)."""
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        mock_conn = AsyncMock()
        mock_db.side_effect = _mock_db_ctx(mock_conn)
        mock_mark.return_value = None

        for _ in range(2):
            resp = await client.put("/api/messages/threads/1/read")
            assert resp.status_code == 200

    # ── Input validation ─────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_mark_read_invalid_thread_id_returns_422(self, client):
        app.dependency_overrides[get_current_user_org] = lambda: _user_org()
        resp = await client.put("/api/messages/threads/abc/read")
        assert resp.status_code == 422

    # ── Auth ─────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_mark_read_requires_auth(self, client):
        resp = await client.put("/api/messages/threads/1/read")
        assert resp.status_code == 401
