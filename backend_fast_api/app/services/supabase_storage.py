import os
import re
import uuid
from pathlib import Path

import httpx
from fastapi import HTTPException, UploadFile

BUCKET_NAME = os.getenv("SUPABASE_STORAGE_BUCKET", "documents")


def _get_supabase_config() -> tuple[str, str]:
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_role_key:
        raise HTTPException(
            status_code=500,
            detail="Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        )

    return supabase_url, service_role_key


def _sanitize_path_segment(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "_", value.strip().lower())
    return cleaned or "unknown"


def _build_object_path(prefix: str, filename: str) -> str:
    safe_name = _sanitize_path_segment(Path(filename or "file").name)
    return f"{prefix}/{uuid.uuid4().hex}_{safe_name}"


def _public_file_url(supabase_url: str, object_path: str) -> str:
    return f"{supabase_url}/storage/v1/object/public/{BUCKET_NAME}/{object_path}"


async def upload_file(upload: UploadFile, prefix: str) -> str:
    if not upload.filename:
        raise HTTPException(status_code=400, detail="Uploaded file is missing a filename.")

    supabase_url, service_role_key = _get_supabase_config()
    object_path = _build_object_path(prefix, upload.filename)
    file_bytes = await upload.read()
    content_type = upload.content_type or "application/octet-stream"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{supabase_url}/storage/v1/object/{BUCKET_NAME}/{object_path}",
            headers={
                "Authorization": f"Bearer {service_role_key}",
                "apikey": service_role_key,
                "Content-Type": content_type,
                "x-upsert": "false",
            },
            content=file_bytes,
        )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to upload '{upload.filename}' to Supabase Storage: {response.text}",
        )

    return _public_file_url(supabase_url, object_path)


async def upload_local_file(local_path: str, filename: str, prefix: str, content_type: str = "application/octet-stream") -> str:
    if not os.path.exists(local_path):
        raise HTTPException(status_code=400, detail=f"Local file not found: {local_path}")

    supabase_url, service_role_key = _get_supabase_config()
    object_path = _build_object_path(prefix, filename)
    
    with open(local_path, "rb") as f:
        file_bytes = f.read()

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{supabase_url}/storage/v1/object/{BUCKET_NAME}/{object_path}",
            headers={
                "Authorization": f"Bearer {service_role_key}",
                "apikey": service_role_key,
                "Content-Type": content_type,
                "x-upsert": "false",
            },
            content=file_bytes,
        )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to upload '{filename}' to Supabase Storage: {response.text}",
        )

    return _public_file_url(supabase_url, object_path)



async def upload_optional_file(upload: UploadFile | None, prefix: str) -> str | None:
    if upload is None or not upload.filename:
        return None
    return await upload_file(upload, prefix)


async def upload_optional_files(uploads: list[UploadFile], prefix: str) -> list[str]:
    urls: list[str] = []
    for upload in uploads:
        if not upload.filename:
            continue
        urls.append(await upload_file(upload, prefix))
    return urls


def build_registration_prefix(email: str) -> str:
    return f"registrations/{_sanitize_path_segment(email)}"
