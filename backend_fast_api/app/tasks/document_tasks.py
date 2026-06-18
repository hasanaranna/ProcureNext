# ============================================================
# tasks/document_tasks.py - Async Document Processing Tasks
# ============================================================
# PURPOSE:
# Celery tasks for document-related background processing.
# Heavy computational work is offloaded here to prevent
# HTTP timeouts on the main thread.
#
# TASKS TO DEFINE:
#
# - process_tender_document(tender_id, file_path):
#     1. Send the uploaded PDF to the ML microservice for parsing
#     2. ML service extracts text, keywords, and generates
#        vector embedding (768-dim from all-MiniLM-L6-v2)
#     3. Store the parsed text and embedding back in the
#        TENDERS table (embedding column) for semantic search
#     4. Update tender status/metadata with extracted info
#     5. Frontend polls for completion status via task_id
#
# - process_bulk_documents(tender_id, file_paths):
#     Process multiple tender documents in sequence
#
# - reindex_tender_embeddings():
#     Periodic task: regenerate embeddings for tenders that
#     may have been updated (title/description changes)
#
# FLOW (from PDF sequence diagram):
#   Buyer uploads -> Backend enqueues task -> Celery worker picks up
#   -> Worker calls ML service -> ML extracts text + generates vectors
#   -> Vectors saved to pgvector -> Worker updates task status
#   -> Frontend polls and displays results when ready
# ============================================================
