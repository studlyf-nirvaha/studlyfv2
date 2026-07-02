"""
Cleanup script: remove duplicate judge score entries from scores_col.
Keeps only the single highest-scoring judge entry per submission.
Run once after deploying the backend fixes, then reassign judges.

Usage: python scripts/cleanup_duplicate_judges.py
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv()

from db import scores_col, submission_data_col

async def main():
    pipeline = [
        {"$group": {
            "_id": "$submission_id",
            "entries": {"$push": {
                "_id": "$_id",
                "judge_id": "$judge_id",
                "judge_email": "$judge_email",
                "judge_name": "$judge_name",
                "score": "$total_score",
                "feedback": "$feedback",
                "comments": "$comments",
            }},
            "count": {"$sum": 1},
        }},
        {"$match": {"count": {"$gt": 1}}},
    ]
    duplicates = await scores_col.aggregate(pipeline).to_list(length=1000)
    print(f"Found {len(duplicates)} submissions with multiple score entries")

    total_removed = 0
    for group in duplicates:
        sid = group["_id"]
        entries = group["entries"]
        # Dedup by judge identity: combine entries with same judge_id or judge_email
        deduped = {}
        for e in entries:
            key = str(e.get("judge_id") or "").strip() or str(e.get("judge_email") or "").strip().lower()
            if not key:
                continue
            if key not in deduped or (e.get("score") or 0) > (deduped[key].get("score") or 0):
                deduped[key] = e
        # Keep only the single highest-scoring judge entry
        best = max(deduped.values(), key=lambda x: x.get("score") or 0)
        best_id = best["_id"]
        ids_to_delete = [e["_id"] for e in entries if str(e["_id"]) != str(best_id)]
        if ids_to_delete:
            result = await scores_col.delete_many({"_id": {"$in": ids_to_delete}})
            total_removed += result.deleted_count
            print(f"  Submission {sid}: removed {result.deleted_count} duplicate(s), kept best score={best.get('score')}")

    print(f"\nDone! Removed {total_removed} duplicate score documents total.")
    print("Now you can reassign judges — only one score per judge will be stored going forward.")

if __name__ == "__main__":
    asyncio.run(main())
