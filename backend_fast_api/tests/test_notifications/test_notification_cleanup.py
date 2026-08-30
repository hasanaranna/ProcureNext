# ============================================================
# tests/test_notifications/test_notification_cleanup.py
# ============================================================

import pytest
from unittest.mock import AsyncMock

from app.modules.notifications.service import delete_notifications_for_tender


class TestDeleteNotificationsForTender:
    @pytest.mark.asyncio
    async def test_deletes_notifications_by_action_url(self):
        mock_conn = AsyncMock()

        await delete_notifications_for_tender(mock_conn, tender_id=42)

        mock_conn.execute.assert_awaited_once()
        sql = mock_conn.execute.call_args.args[0]
        urls = mock_conn.execute.call_args.args[1]
        like_pattern = mock_conn.execute.call_args.args[2]

        assert "reference_type" not in sql
        assert "action_url" in sql
        assert urls == [
            "/view-my-tender/42",
            "/edit-tender/42",
            "/bid-for-tender?id=42",
        ]
        assert like_pattern == "/bid-for-tender?id=42&%"
