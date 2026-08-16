# ============================================================
# auth/dependencies.py - Auth-Specific Dependencies
# ============================================================
# PURPOSE:
# Auth-specific FastAPI dependencies that extend the core
# dependencies for specialized authentication flows.
#
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
# pyrefly: ignore [missing-import]
import asyncpg

from app.core.security import SECRET_KEY, ALGORITHM
from app.core.db import get_db_connection

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user_org(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except JWTError:
        raise credentials_exception

    async with get_db_connection() as connection:
        user_org = await connection.fetchrow(
            """
            SELECT u.user_id, u.email, oe.organization_id, oe.role_in_org, oe.org_user_id
            FROM users u
            JOIN organization_employees oe ON u.user_id = oe.user_id
            WHERE u.user_id = $1
            LIMIT 1
            """,
            user_id
        )
        
        if user_org is None:
            raise HTTPException(status_code=403, detail="User does not belong to any organization.")
            
        return dict(user_org.items())


async def get_current_admin(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except JWTError:
        raise credentials_exception

    async with get_db_connection() as connection:
        admin_row = await connection.fetchrow(
            """
            SELECT u.user_id, u.email, u.full_name, a.admin_id, a.admin_role
            FROM users u
            JOIN admins a ON u.user_id = a.user_id
            WHERE u.user_id = $1
            LIMIT 1
            """,
            user_id
        )
        if admin_row is None:
            raise HTTPException(status_code=403, detail="Platform administrator privileges required.")
            
        return dict(admin_row.items())

