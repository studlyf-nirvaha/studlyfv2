from db import scores_col, submissions_col
from bson import ObjectId
from datetime import datetime, timezone

async def submit_score(submission_id: str, judge_id: str, scores: dict, comments: str, team_id: str = "", event_id: str = ""):
    # Calculate total (sum of rubric scores) and average
    rubric_sum = sum(scores.values())
    avg_score = rubric_sum / len(scores) if scores else 0
    now = datetime.now(timezone.utc).isoformat()
    
    # Upsert: one score per judge per submission (unique compound index on submission_id + judge_id)
    set_fields = {
        "scores": scores,
        "comments": comments,
        "total_avg": avg_score,
        "total_score": rubric_sum,
        "updated_at": now,
        "event_id": event_id,
    }
    if team_id:
        set_fields["team_id"] = team_id
    result = await scores_col.update_one(
        {"submission_id": submission_id, "judge_id": judge_id},
        {"$set": set_fields, "$setOnInsert": {
            "created_at": now
        }},
        upsert=True
    )
    
    # Update submission with the score — only update the collection that actually has this document
    if team_id:
        try:
            from db import submission_data_col
            await submission_data_col.update_one(
                {"_id": ObjectId(submission_id)},
                {"$set": {"total_score": rubric_sum, "status": "Evaluated", "assigned_judge_id": judge_id}}
            )
        except Exception:
            pass
    else:
        await submissions_col.update_one(
            {"_id": ObjectId(submission_id)},
            {"$set": {"status": "Reviewed", "total_score": rubric_sum, "assigned_judge_id": judge_id}}
        )
    
    # Retrieve the document to return the _id
    score_doc = await scores_col.find_one(
        {"submission_id": submission_id, "judge_id": judge_id}
    )
    if score_doc:
        score_doc["_id"] = str(score_doc["_id"])
    else:
        score_doc = {
            "submission_id": submission_id,
            "judge_id": judge_id,
            "scores": scores,
            "comments": comments,
            "total_avg": avg_score,
            "total_score": rubric_sum,
            "event_id": event_id,
            "team_id": team_id,
            "created_at": now,
            "updated_at": now,
            "_id": str(result.upserted_id) if result.upserted_id else ""
        }
    return score_doc

async def get_scores_for_submission(submission_id: str):
    cursor = scores_col.find({"submission_id": submission_id})
    scores = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        scores.append(doc)
    return scores
