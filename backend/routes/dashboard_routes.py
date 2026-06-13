from fastapi import APIRouter, HTTPException, Query, Depends
from auth_institution import get_auth_user, assert_institution_scope
from services.dashboard_service import get_institution_stats
from utils.cache import cache_response

router = APIRouter(prefix="/api/institution/dashboard", tags=["Institution Dashboard"])

@router.get("/stats")
@cache_response("inst_stats")
async def fetch_dashboard_stats(institution_id: str = Query(...), user: dict = Depends(get_auth_user)):
    assert_institution_scope(institution_id, user)
    try:
        return await get_institution_stats(institution_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
