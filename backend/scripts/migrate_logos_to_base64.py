from typing import Optional
"""
Migration: Convert legacy file-path logos/banners to base64 in MongoDB.
Reads files from the local uploads directory and stores them as base64 data URIs.
"""
import os
import sys
import base64
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import asyncio

BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))

def extract_local_path(val: str) -> Optional[str]:
    """Convert a stored URL to a local file path if possible."""
    # Stored as absolute Render URL: https://studlyf-tlkk.onrender.com/uploads/events/x.png
    # Stored as relative path: /uploads/events/x.png or uploads/events/x.png
    if "uploads/" not in val:
        return None
    idx = val.index("uploads/")
    rel = val[idx:]  # e.g. "uploads/events/x.png"
    return os.path.join(BACKEND_DIR, rel)

async def convert_file_to_b64(local_path: str) -> Optional[str]:
    if not os.path.exists(local_path):
        print(f"  [SKIP] File not found: {local_path}")
        return None
    ext = os.path.splitext(local_path)[1].lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp"}
    mime = mime_map.get(ext, "image/png")
    with open(local_path, "rb") as f:
        data = base64.b64encode(f.read()).decode("utf-8")
    print(f"  [OK] Converted: {local_path} ({len(data)} chars)")
    return f"data:{mime};base64,{data}"

async def migrate():
    url = os.getenv("MONGO_URL")
    if not url:
        print("MONGO_URL not set")
        return
    db_name = os.getenv("DB_NAME", "studlyf_db")

    client = AsyncIOMotorClient(
        url,
        serverSelectionTimeoutMS=20000,
        tlsCAFile=certifi.where() if url.lower().startswith("mongodb+srv://") else None
    )
    db = client[db_name]

    total_converted = 0
    fields = ["logo_url", "banner_url"]

    for col_name in ["events", "opportunities", "institutions"]:
        col = db[col_name]
        async for doc in col.find({}):
            changed = False
            for f in fields:
                val = doc.get(f, "")
                if not val or val.startswith("data:"):
                    continue
                local = extract_local_path(val)
                if not local:
                    continue
                print(f"[{col_name}] {doc.get('_id')}: converting {f}")
                b64 = await convert_file_to_b64(local)
                if b64:
                    await col.update_one({"_id": doc["_id"]}, {"$set": {f: b64}})
                    total_converted += 1
                    changed = True
            if changed:
                print(f"  -> Updated {col_name} {doc.get('_id')}")

    client.close()
    print(f"\nDone. Converted {total_converted} fields to base64.")

if __name__ == "__main__":
    asyncio.run(migrate())
