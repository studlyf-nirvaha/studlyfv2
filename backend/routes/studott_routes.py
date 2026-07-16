from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import re

from db import db
from domain_models import EducationalVideo, SavedVideo, WatchHistory

router = APIRouter()

# --- ADMIN API: Manage Videos ---

@router.post("/videos", response_model=EducationalVideo)
async def add_video(video: EducationalVideo):
    # If videoId is missing but youtubeUrl is present, extract it
    if not video.videoId and video.youtubeUrl:
        match = re.search(r'(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*', video.youtubeUrl)
        if match and len(match.group(1)) == 11:
            video.videoId = match.group(1)
            video.thumbnailUrl = f"https://img.youtube.com/vi/{video.videoId}/maxresdefault.jpg"
            
    if not video.id:
        video.id = str(uuid.uuid4())
        
    try:
        await db.db.educational_videos.insert_one(video.dict(by_alias=True))
        return video
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/videos/{video_id}", response_model=EducationalVideo)
async def update_video(video_id: str, video_update: dict):
    result = await db.db.educational_videos.find_one_and_update(
        {"_id": video_id},
        {"$set": video_update},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Video not found")
    return result

@router.delete("/videos/{video_id}")
async def delete_video(video_id: str):
    result = await db.db.educational_videos.delete_one({"_id": video_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"message": "Video deleted successfully"}

# --- STUDENT API: Videos & Search ---

@router.get("/videos", response_model=List[EducationalVideo])
async def get_videos(category: Optional[str] = None, search: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}},
            {"channelName": {"$regex": search, "$options": "i"}}
        ]
        
    cursor = db.db.educational_videos.find(query).sort("createdAt", -1)
    videos = await cursor.to_list(length=1000)
    for v in videos:
        v["_id"] = str(v["_id"])
    return videos

# --- STUDENT API: My List ---

@router.post("/mylist")
async def save_to_mylist(saved: SavedVideo):
    if not saved.id:
        saved.id = str(uuid.uuid4())
    try:
        # Upsert to avoid duplicates
        await db.db.saved_videos.update_one(
            {"studentId": saved.studentId, "videoId": saved.videoId},
            {"$set": saved.dict(by_alias=True)},
            upsert=True
        )
        return {"message": "Saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/mylist/{student_id}/{video_id}")
async def remove_from_mylist(student_id: str, video_id: str):
    await db.db.saved_videos.delete_one({"studentId": student_id, "videoId": video_id})
    return {"message": "Removed successfully"}

@router.get("/mylist/{student_id}", response_model=List[EducationalVideo])
async def get_mylist(student_id: str):
    saved_records = await db.db.saved_videos.find({"studentId": student_id}).to_list(length=100)
    video_ids = [r["videoId"] for r in saved_records]
    
    videos = await db.db.educational_videos.find({"videoId": {"$in": video_ids}}).to_list(length=100)
    return videos

# --- STUDENT API: Watch History ---

@router.post("/history")
async def update_history(history: WatchHistory):
    if not history.id:
        history.id = str(uuid.uuid4())
    history.lastWatchedDate = datetime.now(timezone.utc)
    try:
        await db.db.watch_history.update_one(
            {"studentId": history.studentId, "videoId": history.videoId},
            {"$set": history.dict(by_alias=True)},
            upsert=True
        )
        # Increment view count
        await db.db.educational_videos.update_one(
            {"videoId": history.videoId},
            {"$inc": {"views": 1}}
        )
        return {"message": "History updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{student_id}", response_model=List[dict])
async def get_history(student_id: str):
    history_records = await db.db.watch_history.find({"studentId": student_id}).sort("lastWatchedDate", -1).to_list(length=20)
    video_ids = [r["videoId"] for r in history_records]
    
    videos = await db.db.educational_videos.find({"videoId": {"$in": video_ids}}).to_list(length=20)
    video_map = {v["videoId"]: v for v in videos}
    
    result = []
    for r in history_records:
        if r["videoId"] in video_map:
            v_dict = video_map[r["videoId"]]
            v_dict["watchProgress"] = r.get("watchProgress", 0)
            result.append(v_dict)
            
    return result

# --- ADMIN API: Manage Blogs ---
from domain_models import EducationalBlog

@router.post("/blogs", response_model=EducationalBlog)
async def add_blog(blog: EducationalBlog):
    if not blog.id:
        blog.id = str(uuid.uuid4())
    try:
        await db.db.educational_blogs.insert_one(blog.dict(by_alias=True, exclude_none=True))
        return blog
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/blogs/{blog_id}", response_model=EducationalBlog)
async def update_blog(blog_id: str, blog_update: dict):
    result = await db.db.educational_blogs.find_one_and_update(
        {"_id": blog_id},
        {"$set": blog_update},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Blog not found")
    return result

@router.delete("/blogs/{blog_id}")
async def delete_blog(blog_id: str):
    result = await db.db.educational_blogs.delete_one({"_id": blog_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog not found")
    return {"message": "Blog deleted successfully"}

# --- STUDENT API: Blogs ---

@router.get("/blogs", response_model=List[EducationalBlog])
async def get_blogs(category: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
        
    cursor = db.db.educational_blogs.find(query).sort("createdAt", -1)
    blogs = await cursor.to_list(length=100)
    for b in blogs:
        b["_id"] = str(b["_id"])
    return blogs

