from datetime import datetime
from typing import Optional
from bson import ObjectId
from db import scores_col, submissions_col, submission_data_col, leaderboard_col, events_col

class LeaderboardService:
    async def calculate_event_leaderboard(self, event_id: str, stage_id: Optional[str] = None, max_entries: int = 5000):
        """
        Dynamically calculates rankings by aggregating judge scores, optionally filtered by stage_id.
        """
        # Local imports to avoid circular reference
        from integration_routes import collect_event_id_variants

        event_id_variants = await collect_event_id_variants(event_id)
        event_id_in = list(event_id_variants)
        for vid in list(event_id_variants):
            if ObjectId.is_valid(vid):
                try:
                    event_id_in.append(ObjectId(vid))
                except Exception:
                    pass

        # 1. Base query for event
        query = {"event_id": {"$in": event_id_in}}
        if stage_id:
            query["stage_id"] = stage_id

        # 1. Get submissions for the event from both collections (with limits to prevent OOM)
        submissions = await submissions_col.find(
            query,
            {"_id": 1, "team_id": 1, "user_id": 1, "participant_id": 1, "team_name": 1, "project_name": 1, "project_title": 1, "stage_id": 1}
        ).to_list(length=max_entries)
        stage_submissions = await submission_data_col.find(
            query,
            {"_id": 1, "team_id": 1, "user_id": 1, "participant_id": 1, "team_name": 1, "data.project_name": 1, "data.project_title": 1, "stage_id": 1}
        ).to_list(length=max_entries)
        
        # Combine submissions (ensure we don't have duplicates if id overlaps)
        all_submissions = submissions + stage_submissions
        if not all_submissions:
            return []

        from db import teams_col, participants_col, users_col

        # Batch query all scores for the event/stage up front
        score_query = {"event_id": {"$in": event_id_in}}
        if stage_id:
            score_query["stage_id"] = stage_id
        scores_list = await scores_col.find(score_query).to_list(length=100000)
        
        # Build maps for O(1) in-memory lookups
        scores_by_sub = {}
        scores_by_team = {}
        for s in scores_list:
            sid = str(s.get("submission_id") or "")
            if sid:
                scores_by_sub.setdefault(sid, []).append(s)
                try:
                    scores_by_sub.setdefault(ObjectId(sid), []).append(s)
                except Exception:
                    pass
            tid = str(s.get("team_id") or "")
            if tid:
                scores_by_team.setdefault(tid, []).append(s)
                try:
                    scores_by_team.setdefault(ObjectId(tid), []).append(s)
                except Exception:
                    pass

        # Batch fetch all teams for the event (limit to prevent OOM)
        teams_list = await teams_col.find({"event_id": {"$in": event_id_in}}).to_list(length=max_entries)
        teams_map = {}
        for team in teams_list:
            teams_map[str(team["_id"])] = team
            try:
                teams_map[ObjectId(str(team["_id"]))] = team
            except Exception:
                pass

        # Collect user/participant IDs
        user_ids = set()
        participant_ids = set()
        for sub in all_submissions:
            uid = sub.get("user_id")
            pid = sub.get("participant_id")
            if uid:
                user_ids.add(str(uid))
            if pid:
                participant_ids.add(str(pid))
                try:
                    participant_ids.add(ObjectId(str(pid)))
                except Exception:
                    pass
        
        for team in teams_list:
            leader_id = team.get("team_leader_id") or team.get("leader_id")
            if leader_id:
                user_ids.add(str(leader_id))
            for member in team.get("members", []) or []:
                member_uid = member.get("user_id") or member.get("id") or member.get("_id")
                if member_uid:
                    user_ids.add(str(member_uid))

        # Batch fetch participants
        part_query = {"$or": [
            {"_id": {"$in": [ObjectId(p) for p in participant_ids if ObjectId.is_valid(p)]}},
            {"user_id": {"$in": list(user_ids)}, "event_id": {"$in": event_id_in}}
        ]} if (participant_ids or user_ids) else None
        
        participants_list = []
        if part_query:
            try:
                participants_list = await participants_col.find(part_query, {"_id": 1, "user_id": 1, "event_id": 1, "full_name": 1, "college_name": 1, "institution_name": 1}).to_list(length=max_entries)
            except Exception:
                pass
        
        participants_by_id = {str(p["_id"]): p for p in participants_list}
        participants_by_user_event = {(str(p["user_id"]), str(p["event_id"])): p for p in participants_list if p.get("user_id") and p.get("event_id")}

        # Batch fetch users
        users_list = []
        if user_ids:
            try:
                users_list = await users_col.find({"user_id": {"$in": list(user_ids)}}).to_list(length=max_entries)
            except Exception:
                pass
        users_map = {str(u["user_id"]): u for u in users_list}

        rankings_data = []

        for sub in all_submissions:
            sub_id = str(sub["_id"])
            
            # Retrieve scores from in-memory dictionary
            scores = []
            seen_score_ids = set()
            
            for s in scores_by_sub.get(sub_id, []):
                s_id = str(s["_id"])
                if s_id not in seen_score_ids:
                    seen_score_ids.add(s_id)
                    scores.append(s)
            try:
                for s in scores_by_sub.get(ObjectId(sub_id), []):
                    s_id = str(s["_id"])
                    if s_id not in seen_score_ids:
                        seen_score_ids.add(s_id)
                        scores.append(s)
            except Exception:
                pass
            
            team_id = sub.get("team_id")
            if team_id:
                for s in scores_by_team.get(str(team_id), []):
                    s_id = str(s["_id"])
                    if s_id not in seen_score_ids:
                        seen_score_ids.add(s_id)
                        scores.append(s)
                try:
                    for s in scores_by_team.get(ObjectId(str(team_id)), []):
                        s_id = str(s["_id"])
                        if s_id not in seen_score_ids:
                            seen_score_ids.add(s_id)
                            scores.append(s)
                except Exception:
                    pass
            
            criteria_averages = {}
            if not scores:
                avg_score = 0
            else:
                # Calculate average score across all criteria and judges
                total_points = 0
                total_criteria = 0
                criteria_sums = {}
                criteria_counts = {}
                
                for s in scores:
                    points_dict = s.get("scores") or s.get("criteria_scores") or {}
                    if isinstance(points_dict, dict) and points_dict:
                        for k, v in points_dict.items():
                            try:
                                val = float(v)
                                criteria_sums[k] = criteria_sums.get(k, 0.0) + val
                                criteria_counts[k] = criteria_counts.get(k, 0) + 1
                                total_points += val
                                total_criteria += 1
                            except (TypeError, ValueError):
                                pass
                    else:
                        total_points += float(s.get("total_score") or s.get("score") or 0)
                        total_criteria += 1
                
                avg_score = round(total_points / total_criteria, 2) if total_criteria > 0 else 0
                
                # Calculate average for each criterion
                for k in criteria_sums:
                    if criteria_counts[k] > 0:
                        criteria_averages[k] = round(criteria_sums[k] / criteria_counts[k], 2)

            # Fetch names and college for integration (fully optimized using in-memory maps)
            team_name = sub.get("team_name") or sub.get("teamName") or ""
            recipient_name = "Participant"
            college = ""
            
            leader_user_id = None
            if sub.get("team_id"):
                team = teams_map.get(str(sub["team_id"])) or teams_map.get(ObjectId(str(sub["team_id"]))) if isinstance(sub["team_id"], (str, ObjectId)) else None
                if team:
                    if not team_name:
                        team_name = team.get("team_name") or team.get("name") or ""
                    leader_user_id = team.get("team_leader_id") or team.get("leader_id")
            
            if sub.get("participant_id"):
                p = participants_by_id.get(str(sub["participant_id"]))
                recipient_name = p.get("full_name", "Participant") if p else "Participant"
            elif sub.get("user_id"): # Fallback for stage submissions
                u = users_map.get(str(sub["user_id"]))
                recipient_name = u.get("full_name", "Participant") if u else "Participant"

            if not team_name or team_name == "Solo Participant":
                team_name = recipient_name or "Solo Participant"
            
            if not leader_user_id:
                leader_user_id = sub.get("user_id") or sub.get("participant_id")

            if leader_user_id:
                p = None
                for ev_var in event_id_in:
                    p = participants_by_user_event.get((str(leader_user_id), str(ev_var)))
                    if p:
                        break
                if p:
                    college = p.get("college_name") or p.get("institution_name") or ""
                
                if not college:
                    u = users_map.get(str(leader_user_id))
                    if u:
                        college = u.get("college_name") or u.get("college") or u.get("institution_name") or ""

            project_name = sub.get("project_name") or (sub.get("data", {}).get("project_name")) or sub.get("project_title") or (sub.get("data", {}).get("project_title")) or "Unnamed Project"

            rankings_data.append({
                "event_id": event_id,
                "team_id": sub.get("team_id"),
                "participant_id": sub.get("participant_id") or sub.get("user_id"),
                "user_id": sub.get("user_id"),
                "participation_type": "TEAM" if sub.get("team_id") else "INDIVIDUAL",
                "team_name": team_name,
                "recipient_name": recipient_name,
                "total_score": avg_score,
                "project_name": project_name,
                "project_title": project_name,
                "criteria_scores": criteria_averages,
                "college": college,
                "institution_name": college,
                "last_updated": datetime.utcnow()
            })

        # 4. Sort by score descending
        rankings_data.sort(key=lambda x: x["total_score"], reverse=True)

        # 5. Assign ranks
        for idx, entry in enumerate(rankings_data):
            entry["rank"] = idx + 1

        # 6. Atomic Sync: Clear old and insert new
        await leaderboard_col.delete_many({"event_id": {"$in": event_id_in}})
        if rankings_data:
            await leaderboard_col.insert_many(rankings_data)
            for entry in rankings_data:
                if "_id" in entry:
                    entry["_id"] = str(entry["_id"])
                if "event_id" in entry:
                    entry["event_id"] = str(entry["event_id"])
                if "team_id" in entry and entry["team_id"] is not None:
                    entry["team_id"] = str(entry["team_id"])
                if "participant_id" in entry and entry["participant_id"] is not None:
                    entry["participant_id"] = str(entry["participant_id"])
                if "user_id" in entry and entry["user_id"] is not None:
                    entry["user_id"] = str(entry["user_id"])

        return rankings_data

leaderboard_service = LeaderboardService()
