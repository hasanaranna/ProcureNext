# ============================================================
# document_tasks.py - Background processing for documents
# ============================================================

import os
import logging
import asyncio
from app.tasks.celery_app import celery_app
from app.services.supabase_storage import upload_local_file

logger = logging.getLogger(__name__)

@celery_app.task(name="upload_tender_documents_to_supabase")
def upload_tender_documents_to_supabase(tender_id: int, files_data: list[dict]):
    """
    Celery background task to upload files to Supabase Storage and record in the database.
    """
    asyncio.run(_async_upload(tender_id, files_data))

async def _async_upload(tender_id: int, files_data: list[dict]):
    import asyncpg
    from app.core.database_url import get_database_url
    
    logger.info(f"Starting background upload for tender_id={tender_id} with {len(files_data)} files.")
    
    try:
        conn = await asyncpg.connect(get_database_url(), ssl="require", statement_cache_size=0)
    except Exception as e:
        logger.error(f"Failed to connect to DB in Celery: {e}")
        return

    try:
        for file_info in files_data:
            local_path = file_info["local_path"]
            custom_name = file_info["custom_name"]
            
            if not os.path.exists(local_path):
                logger.warning(f"File not found locally: {local_path}")
                continue
            
            try:
                # 1. Upload to Supabase Storage using streaming logic
                filename = os.path.basename(local_path)
                prefix = f"tenders/{tender_id}"
                
                logger.info(f"Uploading {filename} to {prefix}...")
                public_url = await upload_local_file(
                    local_path=local_path,
                    filename=filename,
                    prefix=prefix
                )
                
                # 2. Insert into TENDER_DOCUMENTS table
                await conn.execute("""
                    INSERT INTO tender_documents (tender_id, file_name, file_path)
                    VALUES ($1, $2, $3)
                """, tender_id, custom_name, public_url)
                
                logger.info(f"Successfully uploaded and recorded {custom_name}")
                
                # 3. Clean up the temporary local file
                os.remove(local_path)
                
            except Exception as e:
                logger.error(f"Failed to process file {custom_name}: {e}")
                
    except Exception as e:
        logger.error(f"Unexpected error in background upload task: {e}")
    finally:
        await conn.close()
        logger.info(f"Finished background upload task for tender_id={tender_id}")


@celery_app.task(name="upload_bid_documents_to_supabase")
def upload_bid_documents_to_supabase(bid_id: int, files_data: list[dict]):
    """
    Celery background task to upload bid files to Supabase Storage and record in bid_documents.
    """
    asyncio.run(_async_bid_upload(bid_id, files_data))


async def _async_bid_upload(bid_id: int, files_data: list[dict]):
    import asyncpg
    from app.core.database_url import get_database_url

    logger.info(f"Starting background upload for bid_id={bid_id} with {len(files_data)} files.")

    try:
        conn = await asyncpg.connect(get_database_url(), ssl="require", statement_cache_size=0)
    except Exception as e:
        logger.error(f"Failed to connect to DB in Celery (bid upload): {e}")
        return

    try:
        for file_info in files_data:
            local_path = file_info["local_path"]
            doc_type_name = file_info["doc_type_name"]

            if not os.path.exists(local_path):
                logger.warning(f"File not found locally: {local_path}")
                continue

            try:
                # 1. Use req_doc_id directly if provided, fallback to document_types lookup
                doc_type_id = file_info.get("req_doc_id")
                if doc_type_id is None:
                    type_row = await conn.fetchrow(
                        "SELECT type_id FROM document_types WHERE type_name = $1",
                        doc_type_name
                    )
                    if type_row:
                        doc_type_id = type_row["type_id"]

                if doc_type_id is None:
                    logger.error(f"Could not determine req_doc_id for file: {doc_type_name}")
                    continue

                # 2. Upload to Supabase Storage
                filename = os.path.basename(local_path)
                prefix = f"bids/{bid_id}"

                logger.info(f"Uploading {filename} to {prefix}...")
                object_path = await upload_local_file(
                    local_path=local_path,
                    filename=filename,
                    prefix=prefix
                )

                # 3. Insert into BID_DOCUMENTS table
                await conn.execute("""
                    INSERT INTO bid_documents (bid_id, req_doc_id, file_path)
                    VALUES ($1, $2, $3)
                """, bid_id, doc_type_id, object_path)

                logger.info(f"Successfully uploaded and recorded bid doc ({doc_type_name})")

                # 4. Clean up the temporary local file
                os.remove(local_path)

            except Exception as e:
                logger.error(f"Failed to process bid file ({doc_type_name}): {e}")

    except Exception as e:
        logger.error(f"Unexpected error in bid background upload task: {e}")
    finally:
        await conn.close()
        logger.info(f"Finished background upload task for bid_id={bid_id}")
