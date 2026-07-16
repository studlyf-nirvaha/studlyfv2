import asyncio
import os
import sys
import re
from pymongo import AsyncMongoClient
from datetime import datetime, timezone
import uuid

# Path magic to allow importing from parent directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import db
from domain_models import EducationalVideo

async def migrate_csv():
    # Ensure db is connected
    await db.connect()
    
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "public", "data", "studott-content.csv")
    
    if not os.path.exists(csv_path):
        print(f"CSV file not found at {csv_path}")
        return
        
    print(f"Reading from {csv_path}")
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]
        
    videos = []
    current_category = "General"
    
    for line in lines:
        if line.startswith('http'):
            # It's a video
            match = re.search(r'(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*', line)
            if match and len(match.group(1)) == 11:
                video_id = match.group(1)
                
                # Check if already exists to avoid duplicates
                existing = await db.db.educational_videos.find_one({"videoId": video_id})
                if existing:
                    continue
                    
                video = EducationalVideo(
                    id=str(uuid.uuid4()),
                    title=f"Sample Video for {current_category}", # We don't have titles in CSV, they are fetched dynamically via noembed usually
                    youtubeUrl=line,
                    videoId=video_id,
                    thumbnailUrl=f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
                    category=current_category,
                    channelName="Curated Educator",
                    createdAt=datetime.now(timezone.utc)
                )
                videos.append(video.dict(by_alias=True, exclude_none=True))
        else:
            # It's a category header
            current_category = line
            
    if videos:
        await db.db.educational_videos.insert_many(videos)
        print(f"Successfully migrated {len(videos)} videos to the database.")
    else:
        print("No new videos to migrate.")
        
    # Disconnect
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(migrate_csv())
