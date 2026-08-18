# ============================================================
# tests/test_tenders/test_live_pdf_and_vector_supabase.py
# ============================================================

import os
import ssl
import pytest
import asyncpg
from unittest.mock import patch
from datetime import datetime, timezone

from app.core.database_url import get_database_url
from app.modules.tenders.service import create_tender_from_pdf_file
from ml.src.tender_parser import parse_and_embed_tender_pdf

SAMPLE_PDF_PATH = "/home/tawhidumar/codes/ProcureNext/documents/3.pdf"


@pytest.mark.asyncio
async def test_live_supabase_pdf_tender_creation_and_vector384():
    db_url = get_database_url()
    if not db_url or "localhost" in db_url or "127.0.0.1" in db_url:
        pytest.skip("Skipping live database test in local/CI environment without active database.")

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    try:
        conn = await asyncpg.connect(db_url, ssl=ssl_ctx, statement_cache_size=0, timeout=10)
    except Exception as exc:
        pytest.skip(f"Live Supabase database unreachable ({exc}): skipping live integration test.")

    test_tender_id = None
    try:
        # 1. Fetch an existing buyer organization and employee for FK compliance
        buyer_org = await conn.fetchrow("SELECT organization_id FROM organizations LIMIT 1;")
        if not buyer_org:
            pytest.skip("No organization found in database for testing.")
        buyer_id = buyer_org["organization_id"]

        buyer_user = await conn.fetchrow(
            "SELECT org_user_id, user_id FROM organization_employees WHERE organization_id = $1 LIMIT 1;",
            buyer_id
        )
        if not buyer_user:
            buyer_user = await conn.fetchrow("SELECT org_user_id, user_id FROM organization_employees LIMIT 1;")
        
        if not buyer_user:
            pytest.skip("No organization employee found in database for testing.")

        org_user_id = buyer_user["org_user_id"]
        user_id = buyer_user["user_id"]

        # Ensure organization has tokens for publishing
        await conn.execute(
            "UPDATE organizations SET credit_balance = credit_balance + 100 WHERE organization_id = $1",
            buyer_id
        )

        # 2. Execute create_tender_from_pdf_file
        with patch("app.modules.tenders.service.upload_tender_documents_to_supabase.delay"):
            result = await create_tender_from_pdf_file(
                connection=conn,
                buyer_id=buyer_id,
                org_user_id=org_user_id,
                user_id=user_id,
                pdf_path=SAMPLE_PDF_PATH,
                original_filename="3.pdf"
            )

        assert result is not None
        test_tender_id = result["tender_id"]
        assert test_tender_id > 0
        assert "Engagement of yearly contractor" in result["title"]
        assert result["status"] == "Published"

        # 3. Direct DB Inspection of inserted record
        row = await conn.fetchrow(
            """
            SELECT 
                t.tender_id,
                t.title,
                t.description,
                t.eligibility_of_tenderer,
                t.status,
                t.embedding,
                pn.name::text AS nature_name,
                pm.method_code::text AS method_code
            FROM tenders t
            LEFT JOIN procurement_nature pn ON t.nature_id = pn.nature_id
            LEFT JOIN procurement_method pm ON t.method_id = pm.method_id
            WHERE t.tender_id = $1;
            """,
            test_tender_id
        )

        assert row is not None
        assert "Engagement of yearly contractor" in row["title"]
        assert "The required number of similar contracts" in (row["eligibility_of_tenderer"] or "")
        assert row["nature_name"] == "Goods"
        assert row["method_code"] == "OTM"
        assert row["embedding"] is not None

        # 4. Test pgvector vector similarity query on 384-d vector
        parsed = parse_and_embed_tender_pdf(SAMPLE_PDF_PATH)
        query_vec_str = f"[{','.join(str(float(x)) for x in parsed.embedding)}]"

        vec_match = await conn.fetchrow(
            """
            SELECT tender_id, title, (embedding <=> $1::vector) AS cosine_distance
            FROM tenders
            WHERE tender_id = $2;
            """,
            query_vec_str,
            test_tender_id
        )

        assert vec_match is not None
        # Distance to its own embedding should be ~0.0
        assert vec_match["cosine_distance"] < 0.001
        print(f"\n[LIVE SUPABASE TEST PASSED] Created tender_id={test_tender_id}, vector cosine distance={vec_match['cosine_distance']}")

    finally:
        if test_tender_id:
            try:
                await conn.execute("DELETE FROM tender_documents WHERE tender_id = $1", test_tender_id)
                await conn.execute("DELETE FROM tender_required_documents WHERE tender_id = $1", test_tender_id)
                await conn.execute("DELETE FROM credit_transactions WHERE tender_id = $1", test_tender_id)
                await conn.execute("DELETE FROM tenders WHERE tender_id = $1", test_tender_id)
            except Exception as e:
                print(f"Cleanup note: {e}")
        await conn.close()
