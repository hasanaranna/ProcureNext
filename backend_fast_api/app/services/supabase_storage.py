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


async def upload_file(upload: UploadFile, prefix: str) -> str:
    """Upload a file to Supabase Storage and return the object path (not a URL).

    The caller is responsible for generating a signed or public URL from
    the returned path via ``generate_signed_url`` when the file needs to
    be served to a client.
    """
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

    # Return the object path so callers can store it and later generate
    # short-lived signed URLs rather than permanent public ones.
    return object_path


async def generate_signed_url(object_path: str, expires_in: int = 3600) -> str:
    """Generate a short-lived signed URL for a private bucket object.

    Args:
        object_path: The storage object path as returned by ``upload_file``
                     (e.g. ``registrations/user_email/nid/abc123_front.jpg``).
        expires_in:  Seconds until the URL expires. Defaults to 3600 (1 hour).

    Returns:
        A fully-qualified signed URL that can be used directly in an <a href>.
    """
    supabase_url, service_role_key = _get_supabase_config()
    storage_base = f"{supabase_url}/storage/v1"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{storage_base}/object/sign/{BUCKET_NAME}/{object_path}",
            headers={
                "Authorization": f"Bearer {service_role_key}",
                "apikey": service_role_key,
                "Content-Type": "application/json",
            },
            json={"expiresIn": expires_in},
        )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to generate signed URL for '{object_path}': {response.text}",
        )

    data = response.json()
    # Supabase returns signedURL as a path relative to the storage API base
    # e.g. "/object/sign/documents/path?token=TOKEN"
    # We must prepend {supabase_url}/storage/v1 — NOT just supabase_url.
    signed_path: str = data.get("signedURL") or data.get("signedUrl") or ""
    if not signed_path:
        raise HTTPException(
            status_code=502,
            detail=f"Supabase returned no signed URL for '{object_path}': {data}",
        )

    if signed_path.startswith("http"):
        # Already a fully-qualified URL (some Supabase versions return this).
        return signed_path

    # Relative path — prepend the storage API base so the token path matches.
    return f"{storage_base}{signed_path}"


async def generate_signed_url_optional(object_path: str | None, expires_in: int = 3600) -> str | None:
    """Like ``generate_signed_url`` but returns None when object_path is None."""
    if not object_path:
        return None
    return await generate_signed_url(object_path, expires_in)


def _normalize_object_path(path: str) -> str:
    if not path:
        return ""
    if path.startswith("http://") or path.startswith("https://"):
        marker = f"/{BUCKET_NAME}/"
        if marker in path:
            return path.split(marker, 1)[1]
    return path.lstrip("/")


async def delete_files(object_paths: list[str]) -> None:
    """Delete one or more objects from Supabase Storage (private bucket).

    Args:
        object_paths: List of object paths to delete (as stored in the DB,
                      e.g. ``['registrations/user/nid/abc_front.jpg', ...]``).
                      Empty list is a no-op.
    """
    clean_paths = [_normalize_object_path(p) for p in object_paths if p]
    clean_paths = [p for p in clean_paths if p]
    if not clean_paths:
        return

    supabase_url, service_role_key = _get_supabase_config()
    storage_base = f"{supabase_url}/storage/v1"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.request(
            "DELETE",
            f"{storage_base}/object/{BUCKET_NAME}",
            headers={
                "Authorization": f"Bearer {service_role_key}",
                "apikey": service_role_key,
            },
            json={"prefixes": clean_paths},
        )

    # 200 = all deleted, 400 w/ partial results also acceptable (some may not exist).
    # We treat any 5xx as a hard failure; 4xx may just mean files were already gone.
    if response.status_code >= 500:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to delete files from Supabase Storage: {response.text}",
        )




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

    return object_path


async def upload_optional_file(upload: UploadFile | None, prefix: str) -> str | None:
    if upload is None or not upload.filename:
        return None
    return await upload_file(upload, prefix)


async def upload_optional_files(uploads: list[UploadFile], prefix: str) -> list[str]:
    paths: list[str] = []
    for upload in uploads:
        if not upload.filename:
            continue
        paths.append(await upload_file(upload, prefix))
    return paths


def build_registration_prefix(email: str) -> str:
    return f"registrations/{_sanitize_path_segment(email)}"
