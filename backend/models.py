from sqlalchemy import Table, Column, Integer, String, ForeignKey
from database import metadata  # absolute import of the MetaData object


# 1) Tierlist table: one row per list
tierlists = Table(
    "tierlists",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("name", String(100), nullable=False),
    Column("creator_id", String(64), nullable=False),  # linked to Authentik user ID later
)

# 2) Tier table: one row per tier, linked to a tierlist
tiers = Table(
    "tiers",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("tierlist_id", Integer, ForeignKey("tierlists.id", ondelete="CASCADE")),
    Column("name", String(100), nullable=False),   # e.g., "S-Tier", "A-Tier"
    Column("colour", String(20), nullable=False),  # e.g., "#FFCC00"
    Column("position", Integer, nullable=False),   # numeric order: 0, 1, 2, ...
)

# 3) Item table: one row per item—each can be assigned to a tier
items = Table(
    "items",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("tierlist_id", Integer, ForeignKey("tierlists.id", ondelete="CASCADE")),
    Column("tier_id", Integer, ForeignKey("tiers.id", ondelete="SET NULL"), nullable=True),
    Column("position", Integer, nullable=False, default=0),
    Column("name", String(100), nullable=False),
    Column("image_url", String(200), nullable=True),
    Column("preview_url", String(200), nullable=True),

)

# ─── Votes table: one row per (user, item) ───
votes = Table(
    "votes",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("user_id", String(100), nullable=False),    # store Authentik’s “sub” or “uid” as string
    Column("item_id", Integer, ForeignKey("items.id", ondelete="CASCADE")),
    Column("tier_id", Integer, ForeignKey("tiers.id", ondelete="CASCADE")),
    # We’ll enforce “one vote per user per item” in code, not via a DB constraint for simplicity.
)

