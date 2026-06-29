from bson import ObjectId
from fastapi import APIRouter, HTTPException, Body, Query, Depends
from auth_institution import get_auth_user
from services.judge_service import (
    create_judge,
    get_all_judges,
    assign_judge_to_submission,
    send_judge_panel_invitation_email,
    get_judge_invitation_details,
    respond_judge_invitation,
)
from services.score_service import submit_score, get_scores_for_submission
import logging
logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/judges", tags=["Judges"])
portal_router = APIRouter(prefix="/api/judge-portal", tags=["Judge Portal"])

@router.post("")
@router.post("/")
async def add_judge(data: dict = Body(...), user: dict = Depends(get_auth_user)):
    inst_id = user.get("institution_id") or user.get("user_id")
    judge_data = {
        **data,
        "institution_id": inst_id,
        "is_test": data.get("is_test", False),
        "status": data.get("status") or "INVITED",
    }
    result = await create_judge(judge_data)

    email = str(data.get("email") or "").strip().lower()
    email_sent = False
    if email and not data.get("is_test", False) and not data.get("skip_email"):
        email_sent = await send_judge_panel_invitation_email(
            email,
            data.get("name") or data.get("full_name") or email,
            event_title=data.get("event_title") or "Studlyf Institutional Events",
            invitation_token=result.get("invitation_token") or "",
        )
    result["email_sent"] = email_sent
    return result

@router.get("")
@router.get("/")
async def list_judges(user: dict = Depends(get_auth_user)):
    judges = await get_all_judges()
    # Filter out test judges and scope to the authenticated user's institution
    inst_id = user.get("institution_id")
    filtered = [
        j for j in judges
        if not j.get("is_test", False) and (not inst_id or j.get("institution_id") == inst_id)
    ]
    return filtered

@router.post("/assign-round-robin")
async def assign_round_robin_route(
    submission_ids: list = Body(...),
    judge_ids: list = Body(...),
    max_per_judge: int = Body(0),
):
    from services.judge_service import assign_round_robin

    cap = int(max_per_judge) if int(max_per_judge or 0) > 0 else 10_000
    return await assign_round_robin(submission_ids, judge_ids, max_per_judge=cap)


@router.post("/assign")
async def assign_judge(submission_id: str = Body(None), submission_ids: list = Body(None), judge_id: str = Body(...)):
    from services.judge_service import assign_judge_to_multiple_submissions
    
    try:
        logger.info(f"DEBUG: Judge assignment request - submission_id: {submission_id}, submission_ids: {submission_ids}, judge_id: {judge_id}")
        
        if submission_ids:
            result = await assign_judge_to_multiple_submissions(submission_ids, judge_id)
        else:
            result = await assign_judge_to_multiple_submissions([submission_id], judge_id)
            
        logger.info(f"DEBUG: Judge assignment completed: {result}")
        return result
        
    except HTTPException as he:
        logger.error(f"DEBUG: HTTP Exception in judge assignment: {str(he)}")
        raise he
    except Exception as e:
        logger.error(f"DEBUG: Unexpected error in judge assignment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Judge assignment failed: {str(e)}")

@router.post("/score")
async def score_submission(
    submission_id: str = Body(...), 
    judge_id: str = Body(...), 
    scores: dict = Body(...), 
    comments: str = Body(...),
    team_id: str = Body(default=""),
    event_id: str = Body(default=""),
):
    import asyncio
    from db import submissions_col, submission_data_col
    from services.leaderboard_service import leaderboard_service
    from stage_access_control import auto_advance_participant_on_score

    # 1. Submit the score
    result = await submit_score(submission_id, judge_id, scores, comments, team_id=team_id, event_id=event_id)
    rubric_sum = float(result.get("total_score") or 0)

    # 2. Resolve event_id if not provided in request
    if not event_id:
        for col in (submission_data_col, submissions_col):
            doc = await col.find_one({"_id": (ObjectId(submission_id) if ObjectId.is_valid(submission_id) else submission_id)}, {"event_id": 1})
            if doc and doc.get("event_id"):
                event_id = str(doc["event_id"])
                break

    # 3. Auto-advance participant if score meets shortlist threshold
    await auto_advance_participant_on_score(event_id, submission_id, rubric_sum)

    # 4. Refresh leaderboard in background
    async def _refresh():
        sub = await submissions_col.find_one({"_id": (ObjectId(submission_id) if ObjectId.is_valid(submission_id) else submission_id)})
        if sub: await leaderboard_service.calculate_event_leaderboard(sub.get("event_id"))
    asyncio.create_task(_refresh())

    return result

@router.get("/scores/{submission_id}")
async def view_scores(submission_id: str):
    return await get_scores_for_submission(submission_id)

@router.delete("/{judge_id}")
async def delete_judge(judge_id: str):
    from db import judges_col
    result = await judges_col.delete_one({"_id": (ObjectId(judge_id) if ObjectId.is_valid(judge_id) else judge_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Judge not found")
    return {"status": "success"}


@portal_router.get("/invitation-details")
async def portal_invitation_details(token: str = Query(...)):
    logger.info(f"DEBUG: Received invitation-details request for token: '{token}'")
    try:
        result = await get_judge_invitation_details(token)
        logger.info(f"DEBUG: Successfully found invitation for token: '{token}'")
        return result
    except LookupError:
        logger.info(f"DEBUG: Invitation not found for token: '{token}'")
        raise HTTPException(status_code=404, detail="Invitation not found or expired")
    except ValueError as e:
        logger.error(f"DEBUG: Value error for token: '{token}', error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"DEBUG: Unexpected error for token: '{token}', error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@portal_router.post("/respond")
async def portal_respond_invitation(body: dict = Body(...)):
    token = str(body.get("token") or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="token is required")
    try:
        return await respond_judge_invitation(token=token, accept=bool(body.get("accept", True)))
    except LookupError:
        raise HTTPException(status_code=404, detail="Invitation not found or expired")
