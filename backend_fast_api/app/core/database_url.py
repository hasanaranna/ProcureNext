import os


def get_database_url() -> str | None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return None

    database_url = database_url.strip().strip('"').strip("'")

    # Handle accidental "DATABASE_URL=postgresql://..." copy-paste in .env
    if database_url.startswith("DATABASE_URL="):
        database_url = database_url.removeprefix("DATABASE_URL=").strip().strip('"').strip("'")

    # asyncpg expects postgresql://, not SQLAlchemy's postgresql+asyncpg://
    return database_url.replace("postgresql+asyncpg://", "postgresql://", 1).split("?")[0]
