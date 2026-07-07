import os


def get_database_url() -> str | None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return None

    # asyncpg expects postgresql://, not SQLAlchemy's postgresql+asyncpg://
    return database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
