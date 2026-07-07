# ============================================================
# services/storage.py - Object Storage Service (S3/MinIO)
# ============================================================
# PURPOSE:
# Handles all file upload/download operations with S3-compatible
# object storage (MinIO for dev, S3 for production).
#
# RESPONSIBILITIES:
# - Upload files to designated buckets with proper paths
# - Generate pre-signed URLs for secure temporary access
# - Download files from storage
# - Delete files from storage
# - Organize files by type in bucket structure:
#     * tender-documents/   - Tender PDFs, scope of work, BOQ
#     * bid-documents/      - Technical proposals, financial docs
#     * user-documents/     - NID scans, passport photos
#     * org-documents/      - Trade license, TIN, VAT certs
#     * nda-documents/      - Signed NDA files
#     * contract-documents/ - Contract templates and signed copies
#     * amendments/         - Tender amendment PDFs
#     * dispute-documents/  - Evidence for disputes
#
# FUNCTIONS TO IMPLEMENT:
# - upload_file(file, bucket_path): Upload and return stored path
# - get_presigned_url(file_path, expiry): Generate temporary URL
# - download_file(file_path): Get file contents
# - delete_file(file_path): Remove file from storage
# - ensure_bucket_exists(): Create bucket if not exists (startup)
# ============================================================
