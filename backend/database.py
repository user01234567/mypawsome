import os
from databases import Database
from sqlalchemy import MetaData

# Async URL for runtime (used by `databases.Database`)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://tierlord:supersecrettofumagic@db:5432/tierlist"
)

# Derive a purely synchronous URL for SQLAlchemy's create_engine()
# by stripping off "+asyncpg"
SYNC_DATABASE_URL = DATABASE_URL.replace("+asyncpg", "")

# The `database` object (async) for our endpoints
database = Database(DATABASE_URL)
# `metadata` holds our table definitions
metadata = MetaData()
