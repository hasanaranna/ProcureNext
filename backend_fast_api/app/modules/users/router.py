# pyrefly: ignore [missing-import]
import asyncpg
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.db import get_db_connection
from app.modules.auth.dependencies import get_current_user_org
from app.modules.users.schemas import (
    ChangePasswordRequest,
    UserDocumentResponse,
    UserProfileResponse,
    UserProfileUpdate,
)
from app.modules.users.service import (
    change_password,
    get_user_documents,
    get_user_profile,
    update_profile,
    upload_verification_documents,
)

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(current_user: dict = Depends(get_current_user_org)):
    try:
        async with get_db_connection() as connection:
            return await get_user_profile(connection, current_user["user_id"])
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.put("/me/profile", response_model=UserProfileResponse)
async def update_my_profile(
    payload: UserProfileUpdate,
    current_user: dict = Depends(get_current_user_org),
):
    try:
        async with get_db_connection() as connection:
            return await update_profile(connection, current_user["user_id"], payload)
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.put("/me/password")
async def change_my_password(
    payload: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user_org),
):
    try:
        async with get_db_connection() as connection:
            await change_password(connection, current_user["user_id"], payload)
            return {"message": "Password updated successfully."}
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.get("/me/documents", response_model=UserDocumentResponse)
async def list_my_documents(current_user: dict = Depends(get_current_user_org)):
    try:
        async with get_db_connection() as connection:
            return await get_user_documents(connection, current_user["user_id"])
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.post("/me/documents", response_model=UserDocumentResponse)
async def upload_my_documents(
    nidFront: UploadFile | None = File(None),
    nidBack: UploadFile | None = File(None),
    current_user: dict = Depends(get_current_user_org),
):
    try:
        async with get_db_connection() as connection:
            return await upload_verification_documents(
                connection,
                current_user["user_id"],
                current_user["email"],
                nidFront,
                nidBack,
            )
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc
