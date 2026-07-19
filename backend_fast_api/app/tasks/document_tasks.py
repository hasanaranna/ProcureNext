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
        conn = await asyncpg.connect(get_database_url(), ssl="require")
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
