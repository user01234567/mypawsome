import os
import time
from pathlib import Path
from uuid import uuid4

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException,
    Body,
    Depends,
    Request,
    Path as FPath,
)
from fastapi.responses import JSONResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import (
    create_engine,
    select,
    insert,
    delete,
    update,
    text,
    func,
)
from authlib.integrations.starlette_client import OAuth
from PIL import Image

from database import database, metadata, SYNC_DATABASE_URL
from models import tierlists, tiers, items, votes


#######################
# Configuration
#######################


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://tierlord:supersecrettofumagic@db:5432/tierlist",
)
SYNC_DATABASE_URL = DATABASE_URL.replace("+asyncpg", "")

# **Use AUTHENTIK_CLIENT_ID / AUTHENTIK_CLIENT_SECRET** instead of CLIENT_ID/CLIENT_SECRET
AUTHENTIK_BASE_URL = os.getenv("AUTHENTIK_BASE_URL", "")
AUTHENTIK_CLIENT_ID = os.getenv("AUTHENTIK_CLIENT_ID", "")
AUTHENTIK_CLIENT_SECRET = os.getenv("AUTHENTIK_CLIENT_SECRET", "")

if not AUTHENTIK_BASE_URL or not AUTHENTIK_CLIENT_ID or not AUTHENTIK_CLIENT_SECRET:
    raise RuntimeError("Missing Authentik OAuth2 environment variables!")

# OAuth2 via Authlib
oauth = OAuth()
oauth.register(
    name="authentik",
    client_id=AUTHENTIK_CLIENT_ID,
    client_secret=AUTHENTIK_CLIENT_SECRET,
    server_metadata_url=f"{AUTHENTIK_BASE_URL}/.well-known/openid-configuration",
    client_kwargs={"scope": "openid profile email"},
)

# Create FastAPI app
app = FastAPI(title="Tierlist UwU Backend with Authentik OAuth2")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.178.249:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "super-secret-session-key"),
    same_site="lax",
    https_only=False,
)

app.mount("/static", StaticFiles(directory="static"), name="static")

# Ensure uploads directory exists
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

#########################
# Lifespan Events
#########################


@app.on_event("startup")
async def startup():
    # Wait for Postgres, then create tables and connect
    max_retries = 10
    retry_count = 0
    while True:
        try:
            engine = create_engine(SYNC_DATABASE_URL)
            metadata.create_all(engine)
            with engine.connect() as conn:
                res = conn.execute(
                    text(
                        "SELECT 1 FROM information_schema.columns "
                        "WHERE table_name='items' AND column_name='position'"
                    )
                ).first()
                if res is None:
                    conn.execute(
                        text(
                            "ALTER TABLE items ADD COLUMN position INTEGER NOT NULL DEFAULT 0"
                        )
                    )
            break
        except Exception as e:
            retry_count += 1
            if retry_count >= max_retries:
                raise RuntimeError(
                    f"Unable to connect to the database after {max_retries} retries. Last error: {e}"
                )
            print(f"Postgres not ready yet (attempt {retry_count}/{max_retries}): {e}")
            time.sleep(2)
    await database.connect()


@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


##########################
# Authentication
##########################


def get_current_user(request: Request) -> dict:
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@app.get("/auth/login")
async def auth_login(request: Request):
    redirect_uri = request.url_for("auth_callback")
    return await oauth.authentik.authorize_redirect(request, redirect_uri)


@app.get("/auth/callback")
async def auth_callback(request: Request):
    # 1) Log query params
    params = dict(request.query_params)
    print(f"DEBUG: /auth/callback called with params: {params}")

    # 2) Exchange code for token
    try:
        token = await oauth.authentik.authorize_access_token(request)
    except Exception as e:
        import traceback

        traceback.print_exc()
        err_msg = getattr(e, "error", None) or str(e)
        print(f"DEBUG: authorize_access_token failed: {err_msg}")
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {err_msg}")

    # 3) Log token
    print(f"DEBUG: token received: {token}")

    # 4) Handle ID token or fallback to userinfo in token
    user_info = None
    if "id_token" in token:
        try:
            user_info = await oauth.authentik.parse_id_token(request, token)
        except Exception as e:
            import traceback

            traceback.print_exc()
            err_msg = str(e)
            print(f"DEBUG: parse_id_token failed: {err_msg}")
            user_info = token.get("userinfo")  # fallback to userinfo claim
            if not user_info:
                raise HTTPException(
                    status_code=500, detail="No userinfo in token fallback"
                )
    else:
        user_info = token.get("userinfo")
        if not user_info:
            raise HTTPException(status_code=500, detail="No userinfo in token response")

    # 5) Log user_info
    print(f"DEBUG: user_info obtained: {user_info}")

    # 6) Store in session
    user = {
        "id": user_info.get("sub") or user_info.get("uid") or user_info.get("id"),
        "username": user_info.get("name")
        or user_info.get("preferred_username")
        or user_info.get("username"),
        "email": user_info.get("email"),
    }
    request.session["user"] = user

    # 7) Redirect to docs
    return RedirectResponse(url="http://192.168.178.249:5173")


@app.get("/auth/me")
async def auth_me(request: Request, current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"],
    }


############################
# Public / Health Endpoints
############################


@app.get("/")
async def root():
    return {"message": "Tierlist UwU (with Auth!) is online and fluffy!"}


@app.get("/health")
async def health_check():
    try:
        engine = create_engine(SYNC_DATABASE_URL)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            one = result.scalar()
        return {"status": "OK", "db_response": one}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB health check failed: {e}")


@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File is not an image!")
    ext = file.filename.split(".")[-1]
    unique_name = f"{uuid4().hex}.{ext}"
    file_path = UPLOAD_DIR / unique_name
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    return {"filename": unique_name, "url": f"/uploads/{unique_name}"}


@app.get("/uploads/{filename}")
async def get_uploaded_image(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found.")
    return FileResponse(file_path)


################################
# Tierlist CRUD Endpoints
################################


@app.post("/tierlists")
async def create_tierlist(
    payload: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    print("Current user info:", current_user)  # <--- Put it right here, nya!
    name = payload.get("name")
    tier_defs = payload.get("tiers", [])
    if not name:
        raise HTTPException(status_code=400, detail="Tierlist 'name' is required.")
    if not isinstance(tier_defs, list) or len(tier_defs) == 0:
        raise HTTPException(
            status_code=400, detail="Tierlist must have at least one tier definition."
        )
    query_tl = insert(tierlists).values(name=name, creator_id=current_user["id"])
    new_tierlist_id = await database.execute(query_tl)
    for position, tier_def in enumerate(tier_defs):
        tier_name = tier_def.get("name")
        tier_colour = tier_def.get("colour")
        if not tier_name or not tier_colour:
            continue
        query_t = insert(tiers).values(
            tierlist_id=new_tierlist_id,
            name=tier_name,
            colour=tier_colour,
            position=position,
        )
        await database.execute(query_t)
    q = (
        select(tiers)
        .where(tiers.c.tierlist_id == new_tierlist_id)
        .order_by(tiers.c.position)
    )
    created_tiers = await database.fetch_all(q)
    return {
        "tierlist_id": new_tierlist_id,
        "name": name,
        "tiers": [dict(row) for row in created_tiers],
    }


@app.get("/tierlists")
async def list_tierlists():
    rows = await database.fetch_all(select(tierlists))
    return [
        {"id": row["id"], "name": row["name"], "creator_id": row["creator_id"]}
        for row in rows
    ]


@app.get("/tierlists/{tierlist_id}")
async def get_tierlist(
    tierlist_id: int = FPath(..., description="ID of the tierlist to fetch")
):
    tl = await database.fetch_one(
        select(tierlists).where(tierlists.c.id == tierlist_id)
    )
    if not tl:
        raise HTTPException(status_code=404, detail="Tierlist not found.")
    tier_rows = await database.fetch_all(
        select(tiers)
        .where(tiers.c.tierlist_id == tierlist_id)
        .order_by(tiers.c.position)
    )
    return {
        "id": tl["id"],
        "name": tl["name"],
        "creator_id": tl["creator_id"],
        "tiers": [dict(r) for r in tier_rows],
    }


# --- Tier management ---


@app.post("/tierlists/{tierlist_id}/tiers")
async def create_tier(
    tierlist_id: int,
    payload: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    if not await database.fetch_one(
        select(tierlists.c.id).where(tierlists.c.id == tierlist_id)
    ):
        raise HTTPException(status_code=404, detail="Tierlist not found.")
    name = payload.get("name")
    colour = payload.get("colour")
    if not name or not colour:
        raise HTTPException(status_code=400, detail="'name' and 'colour' required.")
    max_row = await database.fetch_one(
        select(text("COALESCE(MAX(position), -1) AS maxpos")).where(
            tiers.c.tierlist_id == tierlist_id
        )
    )
    next_pos = (
        max_row["maxpos"] if max_row and max_row["maxpos"] is not None else -1
    ) + 1
    new_id = await database.execute(
        insert(tiers).values(
            tierlist_id=tierlist_id, name=name, colour=colour, position=next_pos
        )
    )
    row = await database.fetch_one(select(tiers).where(tiers.c.id == new_id))
    return dict(row)


@app.patch("/tiers/{tier_id}")
async def update_tier(
    tier_id: int,
    payload: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    tier = await database.fetch_one(select(tiers).where(tiers.c.id == tier_id))
    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found.")
    updates = {}
    if "name" in payload:
        updates["name"] = payload["name"]
    if "colour" in payload:
        updates["colour"] = payload["colour"]
    if updates:
        await database.execute(
            tiers.update().where(tiers.c.id == tier_id).values(**updates)
        )
    updated = await database.fetch_one(select(tiers).where(tiers.c.id == tier_id))
    return dict(updated)


@app.delete("/tiers/{tier_id}")
async def delete_tier(
    tier_id: int,
    current_user: dict = Depends(get_current_user),
):
    tier = await database.fetch_one(select(tiers).where(tiers.c.id == tier_id))
    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found.")
    tierlist_id = tier["tierlist_id"]
    position = tier["position"]
    await database.execute(tiers.delete().where(tiers.c.id == tier_id))
    # Reorder remaining tiers
    remaining = await database.fetch_all(
        select(tiers)
        .where(tiers.c.tierlist_id == tierlist_id)
        .order_by(tiers.c.position)
    )
    for idx, t in enumerate(remaining):
        if t["position"] != idx:
            await database.execute(
                tiers.update().where(tiers.c.id == t["id"]).values(position=idx)
            )
    return {"status": "deleted"}


@app.post("/tierlists/{tierlist_id}/items")
async def add_item(
    tierlist_id: int,
    name: str = Form(""),
    tier_id: int = Form(None),
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    # 1. Check tierlist exists
    if not await database.fetch_one(
        select(tierlists.c.id).where(tierlists.c.id == tierlist_id)
    ):
        raise HTTPException(status_code=404, detail="Tierlist not found.")

    # 2. Tier check (if tier_id given)
    if tier_id is not None:
        if not await database.fetch_one(
            select(tiers.c.id).where(
                (tiers.c.id == tier_id) & (tiers.c.tierlist_id == tierlist_id)
            )
        ):
            raise HTTPException(
                status_code=400, detail="tier_id is invalid for this tierlist."
            )

    # 3. Save original image to disk
    ext = os.path.splitext(image.filename)[1].lower()
    img_id = uuid4().hex
    original_name = f"{img_id}{ext}"
    preview_name = f"{img_id}_preview{ext}"

    save_dir = "static/images"
    os.makedirs(save_dir, exist_ok=True)
    original_path = os.path.join(save_dir, original_name)
    preview_path = os.path.join(save_dir, preview_name)

    # Save original
    content = await image.read()
    with open(original_path, "wb") as f:
        f.write(content)

    # Generate & save preview
    try:
        with Image.open(original_path) as img:
            # Shrink for preview (max height 256, width auto)
            img.thumbnail((9999, 256))
            img.save(preview_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing failed: {e}")

    image_url = f"/static/images/{original_name}"
    preview_url = f"/static/images/{preview_name}"

    # Determine position within the tier (or unassigned)
    max_pos_row = await database.fetch_one(
        select(func.max(items.c.position)).where(
            (items.c.tierlist_id == tierlist_id)
            & (
                (items.c.tier_id == tier_id)
                if tier_id is not None
                else items.c.tier_id.is_(None)
            )
        )
    )
    next_position = (max_pos_row[0] or -1) + 1

    # 4. Insert to DB (add preview_url as a new column if you want)
    new_item_id = await database.execute(
        insert(items).values(
            tierlist_id=tierlist_id,
            tier_id=tier_id,
            position=next_position,
            name=name,
            image_url=image_url,  # <-- full image
            preview_url=preview_url,  # <-- you need to add this column!
        )
    )
    row = await database.fetch_one(select(items).where(items.c.id == new_item_id))
    return dict(row)


@app.get("/tierlists/{tierlist_id}/items")
async def get_items(
    tierlist_id: int = FPath(..., description="ID of the tierlist to fetch items for")
):
    if not await database.fetch_one(
        select(tierlists.c.id).where(tierlists.c.id == tierlist_id)
    ):
        raise HTTPException(status_code=404, detail="Tierlist not found.")
    rows = await database.fetch_all(
        select(items)
        .where(items.c.tierlist_id == tierlist_id)
        .order_by(items.c.tier_id, items.c.position)
    )
    return [dict(r) for r in rows]


@app.patch("/items/{item_id}")
async def update_item(
    item_id: int = FPath(..., description="ID of the item to update"),
    payload: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    row = await database.fetch_one(
        select(items.c.tierlist_id).where(items.c.id == item_id)
    )

    if not row:
        raise HTTPException(status_code=404, detail="Item not found.")

    tierlist_id = row["tierlist_id"]

    # Ensure the current user is the creator of this tierlist
    creator_row = await database.fetch_one(
        select(tierlists.c.creator_id).where(tierlists.c.id == tierlist_id)
    )
    if not creator_row:
        raise HTTPException(status_code=404, detail="Tierlist not found.")
    if creator_row["creator_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the creator can move items.")

    new_tier_id = payload.get("tier_id")
    new_position = payload.get("position")

    update_data = {}

    if new_tier_id is not None:
        if not await database.fetch_one(
            select(tiers.c.id).where(
                (tiers.c.id == new_tier_id) & (tiers.c.tierlist_id == tierlist_id)
            )
        ):
            raise HTTPException(
                status_code=400, detail="tier_id is invalid for this item."
            )
            update_data["tier_id"] = new_tier_id

    if new_position is not None:
        update_data["position"] = new_position

    if update_data:
        await database.execute(
            items.update().where(items.c.id == item_id).values(**update_data)
        )

    updated = await database.fetch_one(select(items).where(items.c.id == item_id))
    return dict(updated)


# ─── CAST OR UPDATE A VOTE ───
@app.post("/items/{item_id}/vote")
async def cast_vote(
    item_id: int = FPath(..., description="ID of the item to vote on"),
    payload: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Payload: { "tier_id": <int> }
    Records or updates the current_user's vote for the given item.
    """
    tier_id = payload.get("tier_id")
    if tier_id is None:
        raise HTTPException(status_code=400, detail="Payload must include 'tier_id'.")

    # 1️⃣ Ensure item exists
    row_item = await database.fetch_one(
        select(items.c.tierlist_id).where(items.c.id == item_id)
    )
    if not row_item:
        raise HTTPException(status_code=404, detail="Item not found.")

    # 2️⃣ Ensure the given tier_id belongs to the same tierlist as the item
    tierlist_of_item = row_item["tierlist_id"]
    row_tier = await database.fetch_one(
        select(tiers.c.id).where(
            (tiers.c.id == tier_id) & (tiers.c.tierlist_id == tierlist_of_item)
        )
    )
    if not row_tier:
        raise HTTPException(status_code=400, detail="Invalid 'tier_id' for this item.")

    # 3️⃣ Upsert: does a vote already exist for this (user_id, item_id)?
    uid = current_user["id"]
    existing = await database.fetch_one(
        select(votes.c.id).where(
            (votes.c.user_id == uid) & (votes.c.item_id == item_id)
        )
    )

    if existing:
        # Update the existing vote
        await database.execute(
            votes.update().where(votes.c.id == existing["id"]).values(tier_id=tier_id)
        )
    else:
        # Insert a new vote
        await database.execute(
            insert(votes).values(user_id=uid, item_id=item_id, tier_id=tier_id)
        )

    return {"status": "ok", "item_id": item_id, "tier_id": tier_id, "user_id": uid}


# ─── GET VOTES FOR A TIERLIST ───
@app.get("/tierlists/{tierlist_id}/votes")
async def get_tierlist_votes(
    tierlist_id: int = FPath(..., description="ID of the tierlist to fetch votes for")
):
    """
    Returns a tally of votes per item for a given tierlist.
    Response:
      {
        "item_id": <int>,
        "name": "<string>",
        "image_url": "<string or null>",
        "votes": {
           "<tier_id>": <count>,
           ...
        }
      }
    """
    # 1️⃣ Ensure tierlist exists
    tl = await database.fetch_one(
        select(tierlists.c.id).where(tierlists.c.id == tierlist_id)
    )
    if not tl:
        raise HTTPException(status_code=404, detail="Tierlist not found.")

    # 2️⃣ Fetch all items in that tierlist
    item_rows = await database.fetch_all(
        select(items).where(items.c.tierlist_id == tierlist_id)
    )

    results = []
    for item in item_rows:
        item_id = item["id"]
        # 3️⃣ Count votes per tier_id for this item
        vote_counts = await database.fetch_all(
            select(votes.c.tier_id, text("COUNT(*) AS count"))
            .where(votes.c.item_id == item_id)
            .group_by(votes.c.tier_id)
        )
        # Build a dict { tier_id: count }
        counts_dict = {row["tier_id"]: row["count"] for row in vote_counts}
        results.append(
            {
                "item_id": item_id,
                "name": item["name"],
                "image_url": item["image_url"],
                "votes": counts_dict,
            }
        )

    return results
