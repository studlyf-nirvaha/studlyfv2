import asyncio

from db import db, events_col, users_col, notifications_col, institutions_col
from domain_models import Opportunity, OpportunityApplication
from bson import ObjectId
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from services.email_service import send_notification_email, get_registration_template, get_shortlist_template

opportunities_col = db["opportunities"]
opportunity_applications_col = db["opportunity_applications"]
participants_col = db["participants"]

_process_stats_cache = {}  # event_id -> (timestamp, data)

async def _hydrate_public_process_stats(doc: dict) -> None:
    """Add counts-only process stats for learner view (no PII)."""
    if not doc:
        return
    eid = doc.get("event_link_id")
    if not eid:
        return

    # 30-second TTL Cache
    now = datetime.utcnow()
    cached = _process_stats_cache.get(str(eid))
    if cached:
        cache_time, cached_data = cached
        if (now - cache_time).total_seconds() < 30:
            doc["processStats"] = cached_data
            return

    try:
        # Total registered is the safest, already mirrored via applicantsCount, but we also compute from participants.
        total_registered = await participants_col.count_documents({"event_id": str(eid)})
        by_status_cur = participants_col.aggregate(
            [
                {"$match": {"event_id": str(eid)}},
                {"$group": {"_id": {"status": "$status", "stage": "$current_stage"}, "count": {"$sum": 1}}},
            ]
        )
        by_status: dict = {}
        by_stage: dict = {}
        async for row in by_status_cur:
            key = row.get("_id") or {}
            st = str(key.get("status") or "pending").lower()
            stage = str(key.get("stage") or "").strip()
            c = int(row.get("count") or 0)
            by_status[st] = by_status.get(st, 0) + c
            if stage:
                by_stage[stage] = by_stage.get(stage, 0) + c
        stats = {
            "registered": int(total_registered),
            "byStatus": by_status,
            "byStage": by_stage,
        }
        _process_stats_cache[str(eid)] = (now, stats)
        doc["processStats"] = stats
    except Exception:
        doc["processStats"] = {"registered": int(doc.get("applicantsCount") or 0), "byStatus": {}, "byStage": {}}


async def _notify_portal_review(app: dict, opp: dict, new_status: str) -> None:
    uid = str(app.get("user_id") or "")
    if not uid or not opp:
        return
    title = opp.get("title") or "your opportunity"
    st = (new_status or "").lower()
    human = {
        "shortlisted": "shortlisted",
        "accepted": "accepted",
        "rejected": "rejected",
        "pending": "set back to pending",
    }.get(st, st)
    msg = f'Your application to "{title}" was updated: {human}.'
    oid = str(opp.get("_id") or "")
    try:
        await notifications_col.insert_one(
            {
                "user_id": uid,
                "type": "opportunity_application_review",
                "message": msg,
                "is_read": False,
                "created_at": datetime.utcnow().isoformat(),
                "meta": {"opportunity_id": oid, "application_id": str(app.get("_id")), "status": st},
            }
        )
    except Exception:
        pass
    user = await users_col.find_one({"user_id": uid})
    email = (user or {}).get("email")
    if email:
        if st == "shortlisted":
            subj = f"CONGRATULATIONS: You've been shortlisted for {title}!"
            body = get_shortlist_template(user.get("full_name", "Participant"), title, "")
        else:
            subj = f"Application update: {title}"
            body = f"""<html><body style="font-family: 'Poppins', sans-serif;color:#111827"><p>{msg}</p>
            <p>Open Studlyf → Opportunities → My applications to review your status.</p></body></html>"""
        asyncio.create_task(send_notification_email(email, subj, body))

# Event must be published-like for learners to see the mirrored listing
_LISTABLE_EVENT_STATUSES = frozenset({"LIVE", "PUBLISHED", "ACTIVE", "UPCOMING"})


def _event_status_listable(status) -> bool:
    if status is None:
        return False
    return str(status).strip().upper() in _LISTABLE_EVENT_STATUSES


def _strip_payload_bloat(doc: dict) -> None:
    """Remove embedded binary blobs that inflate API responses."""
    if not doc:
        return
    for key in ("banner_url", "image_url", "logo_url", "profilePhoto"):
        val = doc.get(key)
        if isinstance(val, str) and val.startswith("data:") and len(val) > 2048:
            doc.pop(key, None)
    sections = doc.get("sections")
    if isinstance(sections, list):
        for section in sections:
            if not isinstance(section, dict):
                continue
            for block in section.get("blocks") or section.get("content") or []:
                if isinstance(block, dict):
                    for bk in ("image", "url", "src", "data"):
                        bv = block.get(bk)
                        if isinstance(bv, str) and bv.startswith("data:") and len(bv) > 2048:
                            block.pop(bk, None)
    attachments = doc.get("attachments")
    if isinstance(attachments, list):
        doc["attachments"] = [
            a for a in attachments
            if not (
                isinstance(a, dict)
                and isinstance(a.get("url") or a.get("data"), str)
                and str(a.get("url") or a.get("data")).startswith("data:")
            )
        ]


def _apply_event_snapshot_to_opportunity(doc: dict, ev: dict) -> None:
    """Use the source event as the authority for student-visible copy (stages, description, etc.)."""
    if not doc or not ev:
        return
    if ev.get("title"):
        doc["title"] = ev["title"]
    if ev.get("description") is not None:
        doc["description"] = ev.get("description") or ""
    org = ev.get("organisation")
    if org:
        doc["organization"] = org
        doc["organisation"] = org
    if ev.get("skills") is not None:
        doc["skills"] = ev.get("skills")
    stages = ev.get("stages")
    if isinstance(stages, list) and len(stages) > 0:
        doc["stages"] = stages
    fd = ev.get("festivalData") if isinstance(ev.get("festivalData"), dict) else {}
    if ev.get("festivalName"):
        doc["festivalName"] = ev.get("festivalName")
    elif fd.get("name"):
        doc["festivalName"] = fd.get("name")
    if fd.get("startDate"):
        doc["eventStartDate"] = fd.get("startDate")
    if fd.get("endDate"):
        doc["eventEndDate"] = fd.get("endDate")
    # Some events store timeline directly on the event payload (not inside festivalData)
    if ev.get("startDate") or ev.get("start_date") or ev.get("eventStartDate"):
        doc["eventStartDate"] = ev.get("eventStartDate") or ev.get("startDate") or ev.get("start_date")
    if ev.get("endDate") or ev.get("end_date") or ev.get("eventEndDate"):
        doc["eventEndDate"] = ev.get("eventEndDate") or ev.get("endDate") or ev.get("end_date")
    if fd.get("details"):
        doc["festivalDetails"] = fd.get("details")
    if ev.get("websiteUrl"):
        doc["websiteUrl"] = ev.get("websiteUrl")
    mode = ev.get("opportunityMode")
    if mode:
        doc["opportunityMode"] = mode
    city = (ev.get("city") or ev.get("venueAddress") or "").strip()
    m = (mode or doc.get("opportunityMode") or "online").strip()
    if city:
        doc["location"] = f"{city}, {m}"
    elif m:
        doc["location"] = m
    rd = ev.get("registrationDeadline")
    if rd is not None:
        doc["deadline"] = rd
        
    # Override with Registration stage from the new engine if available
    if isinstance(stages, list):
        for s in stages:
            if isinstance(s, dict) and str(s.get("type", "")).upper() == "REGISTRATION":
                reg_end = s.get("end_date") or s.get("endDate") or s.get("deadline")
                if reg_end:
                    doc["deadline"] = reg_end
                    break

    # Prizes (optional; only show if institution provided)
    prize_val = ev.get("prize_pool") or ev.get("prizePool")
    if prize_val and str(prize_val).strip():
        doc["prize_pool"] = prize_val
    if ev.get("prize_distribution") is not None:
        doc["prize_distribution"] = ev.get("prize_distribution")
    elif ev.get("prizeDistribution") is not None:
        doc["prize_distribution"] = ev.get("prizeDistribution")
    elif ev.get("prizes") is not None:
        doc["prize_distribution"] = ev.get("prizes")

    # Attachments / organiser contact (optional)
    if ev.get("attachments") is not None:
        doc["attachments"] = ev.get("attachments")
    elif ev.get("documents") is not None:
        doc["attachments"] = ev.get("documents")
    if ev.get("contacts") is not None:
        doc["contacts"] = ev.get("contacts")
    elif ev.get("contact") is not None:
        doc["contact"] = ev.get("contact")
    elif ev.get("organiserContact") is not None:
        doc["contact"] = ev.get("organiserContact")
    if ev.get("category"):
        doc["category"] = ev["category"]
    rf = ev.get("registrationFields")
    if isinstance(rf, list) and len(rf) > 0:
        doc["registrationFields"] = rf
    ot = ev.get("opportunityType") or ev.get("category")
    if ot:
        doc["type"] = str(ot)  # Use admin-defined type verbatim — no normalization

    # Learner-facing extras (logos, venue line, team rules, eligibility) from the source event
    va = (ev.get("venueAddress") or "").strip()
    ct = (ev.get("city") or "").strip()
    if va or ct:
        doc["venueAddress"] = va
        doc["city"] = ct
        parts = []
        if va:
            parts.append(va)
        if ct and ct.lower() not in va.lower():
            parts.append(ct)
        doc["venueDisplay"] = ", ".join(parts)
    if ev.get("logo_url"):
        doc["logo_url"] = ev.get("logo_url")
    if not doc.get("logo_url") and fd.get("logo_url"):
        doc["logo_url"] = fd.get("logo_url")
    if ev.get("image_url"):
        doc["image_url"] = ev.get("image_url")
    if ev.get("banner_url"):
        doc["banner_url"] = ev.get("banner_url")
    for k in (
        "minTeamSize",
        "maxTeamSize",
        "participationType",
        "candidateTypes",
        "collegeRestriction",
        "genderRestriction",
        "judging_criteria",
        "external_registration_link",
        "externalRegistrationLink",
    ):
        if ev.get(k) is not None:
            doc[k] = ev.get(k)

    # Pass through FAQ data from event to opportunity
    if ev.get("faqs") is not None:
        doc["faqs"] = ev.get("faqs")
    # Dynamic badges for event
    if ev.get("badges") is not None:
        doc["badges"] = ev.get("badges")
    # Section-based page builder data
    if ev.get("sections") is not None:
        doc["sections"] = ev.get("sections")
    if ev.get("seo") is not None:
        doc["seo"] = ev.get("seo")


async def _hydrate_institution_branding(doc: dict) -> None:
    """Attach institution profile logo/name for public opportunity pages."""
    if not doc:
        return
    inst_key = doc.get("institution_id") or doc.get("createdBy")
    if not inst_key:
        return
    try:
        inst = await institutions_col.find_one({"institution_id": str(inst_key)})
    except Exception:
        inst = None
    if not inst:
        return
    if inst.get("logo_url"):
        doc["institution_logo_url"] = inst.get("logo_url")
    if inst.get("name"):
        doc["institution_profile_name"] = inst.get("name")


async def _hydrate_opportunity_list_from_events(docs: List[dict]) -> List[dict]:
    """Batch-load source events for mirrored opportunities (list/cards)."""
    oids = []
    for d in docs:
        eid = d.get("event_link_id")
        if not eid:
            continue
        try:
            oids.append(ObjectId(str(eid)))
        except Exception:
            continue
    if not oids:
        return docs
    ev_map = {}
    cursor = events_col.find({"_id": {"$in": oids}})
    async for ev in cursor:
        ev_map[str(ev["_id"])] = ev
    for d in docs:
        eid = d.get("event_link_id")
        if eid and str(eid) in ev_map:
            _apply_event_snapshot_to_opportunity(d, ev_map[str(eid)])
    return docs


def _all_stages_completed(event: dict, access_days_after_deadline: int = 0) -> bool:
    """Check if all stages in an event are completed (end_date past or stored_status completed/cancelled)."""
    stages = event.get("stages", [])
    if not isinstance(stages, list) or not stages:
        return False  # No stages means we can't determine completion
    now = datetime.now(timezone.utc)
    for stage in stages:
        if not isinstance(stage, dict):
            continue
        stored = str(stage.get("stored_status", "") or "").lower().strip()
        if stored in ("completed", "cancelled"):
            continue
        end_raw = stage.get("end_date") or stage.get("endDate") or stage.get("deadline")
        if not end_raw:
            return False  # Stage with no end date → cannot confirm completion
        end_dt = _safe_dt(end_raw)
        if end_dt is None:
            return False
        # Apply subscription extension
        if access_days_after_deadline and now > end_dt:
            max_visible_until = end_dt + timedelta(days=int(access_days_after_deadline))
            if now <= max_visible_until:
                continue
        if now <= end_dt:
            return False  # Stage still active
    return True


async def _filter_public_opportunities(docs: List[dict]) -> List[dict]:
    """Omit mirrored listings while the source event is still DRAFT (or missing), or when all stages are completed."""
    link_ids = []
    for d in docs:
        eid = d.get("event_link_id")
        if not eid:
            continue
        try:
            link_ids.append(ObjectId(str(eid)))
        except Exception:
            continue

    event_by_id = {}
    if link_ids:
        cursor = events_col.find({"_id": {"$in": link_ids}})
        async for ev in cursor:
            event_by_id[str(ev["_id"])] = ev

    out = []
    # Cache plan rules per institution to avoid duplicate lookups
    plan_rules_cache = {}
    for d in docs:
        eid = d.get("event_link_id")
        if not eid:
            out.append(d)
            continue
        ev = event_by_id.get(str(eid))
        if not ev or not _event_status_listable(ev.get("status")):
            continue

        # Look up subscription extension once per event
        inst_id = ev.get("institution_id")
        access_days = 0
        if inst_id:
            if inst_id not in plan_rules_cache:
                try:
                    from services.subscription_service import get_current_plan_rules
                    rules = await get_current_plan_rules(inst_id)
                    plan_rules_cache[inst_id] = int(rules.get("access_days_after_deadline") or 0)
                except Exception:
                    plan_rules_cache[inst_id] = 0
            access_days = plan_rules_cache[inst_id]

        if _all_stages_completed(ev, access_days):
            continue

        # Enforce deadline (with optional subscription-based extension)
        deadline = d.get("deadline")
        if isinstance(deadline, str):
            deadline = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
        if isinstance(deadline, datetime) and deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        
        if deadline:
            now = datetime.now(timezone.utc)
            if now > deadline:
                max_visible_until = deadline + timedelta(days=int(access_days))
                if now > max_visible_until:
                    continue
        out.append(d)
    return out

async def create_opportunity(data: dict) -> dict:
    """Creates a new opportunity in the database."""
    # Ensure applicantsCount is 0 for new opportunities
    data["applicantsCount"] = 0
    data["createdAt"] = datetime.utcnow()
    data["status"] = str(data.get("status") or "active").strip().lower()
    
    # Handle deadline if it's a string
    if isinstance(data.get("deadline"), str):
        data["deadline"] = datetime.fromisoformat(data["deadline"].replace("Z", "+00:00"))
        
    result = await opportunities_col.insert_one(data)
    data["_id"] = str(result.inserted_id)
    return data

async def get_all_opportunities(filters: dict = None) -> List[dict]:
    """Retrieves all opportunities from the database with optional filtering."""
    try:
        # Performance Optimized: Removed automated sync loop which caused 30s+ latency.
        # Regular Fetching
        query = {"status": "active"}
        if filters:
            if filters.get("type"):
                query["type"] = filters["type"]
            if filters.get("institution_id"):
                query["createdBy"] = filters["institution_id"]

        # Use projection to exclude massive fields for list view
        projection = {
            "description": 0,
            "logo_url": 0
        }

        cursor = opportunities_col.find(query, projection).sort("createdAt", -1)
        opportunities = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            opportunities.append(doc)
        filtered = await _filter_public_opportunities(opportunities)
        return await _hydrate_opportunity_list_from_events(filtered)
    except Exception as e:
        print(f"[CRITICAL] get_all_opportunities failed: {e}")
        import traceback
        traceback.print_exc()
        raise e

async def get_opportunity_by_id(
    opportunity_id: str,
    applicant_user_id: Optional[str] = None,
    include_process_stats: bool = False,
) -> Optional[dict]:
    """Retrieves a single opportunity by its ID.

    Mirrored listings stay hidden until the source event is published, except applicants
    who already applied may still open the record (see ``listingPendingPublish``).
    """
    try:
        doc = None
        # Try finding by direct ID first
        try:
            doc = await opportunities_col.find_one({"_id": ObjectId(opportunity_id)})
        except:
            pass
            
        # Fallback to searching by event_link_id if not found or ID was invalid
        if not doc:
            doc = await opportunities_col.find_one({"event_link_id": str(opportunity_id)})
            
        if not doc:
            return None
        doc["_id"] = str(doc["_id"])
        eid = doc.get("event_link_id")
        if eid:
            try:
                ev = await events_col.find_one({"_id": ObjectId(str(eid))})
            except Exception as e:
                print(f"[ERROR] Failed to fetch event {eid}: {e}")
                ev = None
            if not ev:
                # Return the opportunity without event data if event not found
                try:
                    await _hydrate_institution_branding(doc)
                except Exception:
                    pass
                _strip_payload_bloat(doc)
                return doc
            if not _event_status_listable(ev.get("status")):
                if applicant_user_id:
                    try:
                        has_app = await opportunity_applications_col.count_documents(
                            {"opportunity_id": str(doc["_id"]), "user_id": applicant_user_id}
                        )
                    except Exception:
                        has_app = 0
                    if has_app:
                        doc["listingPendingPublish"] = True
                        doc["sourceEventStatus"] = str(ev.get("status") or "")
                        _apply_event_snapshot_to_opportunity(doc, ev)
                        try:
                            await _hydrate_institution_branding(doc)
                        except Exception:
                            pass
                        if include_process_stats:
                            try:
                                await _hydrate_public_process_stats(doc)
                            except Exception:
                                pass
                        _strip_payload_bloat(doc)
                        return doc
                return None
            _apply_event_snapshot_to_opportunity(doc, ev)
            try:
                await _hydrate_institution_branding(doc)
            except Exception:
                pass
            if include_process_stats:
                try:
                    await _hydrate_public_process_stats(doc)
                except Exception:
                    pass
            _strip_payload_bloat(doc)
            return doc
        try:
            await _hydrate_institution_branding(doc)
        except Exception:
            pass
        _strip_payload_bloat(doc)
        return doc
    except Exception as e:
        print(f"[ERROR] get_opportunity_by_id failed: {e}")
        import traceback
        traceback.print_exc()
        return None

async def apply_for_opportunity(application_data: dict) -> dict:
    """Saves a new application for an opportunity."""
    oid = str(application_data.get("opportunity_id", ""))
    uid = str(application_data.get("user_id", ""))
    
    if oid:
        try:
            opp = await opportunities_col.find_one({"_id": ObjectId(oid)})
        except:
            opp = None
        # Fetch user profile for eligibility checks
        user_profile = None
        try:
            user_profile = await users_col.find_one({"user_id": uid})
        except Exception:
            user_profile = None

        # Eligibility enforcement based on opportunity fields
        if opp:
            # Candidate types (e.g. Everyone, College Students, Freshers, Professionals, School Students)
            cand_types = opp.get("candidateTypes") or opp.get("candidate_types") or []
            if isinstance(cand_types, list) and len(cand_types) > 0:
                # Normalize and check for everyone
                low = [str(x).strip().lower() for x in cand_types if x]
                if not any("every" in x for x in low):
                    # need applicant candidate type
                    applicant_type = str(application_data.get("candidateType") or application_data.get("candidate_type") or (user_profile or {}).get("candidateType") or (user_profile or {}).get("role") or "").strip().lower()
                    if not applicant_type or applicant_type not in low:
                        raise ValueError("You are not eligible to apply for this opportunity")

            # Eligible organizations / college restriction
            eligible_orgs = opp.get("eligibleOrganizations") or opp.get("eligible_organizations") or []
            # Some old docs use collegeRestriction as a string marker
            college_restr = opp.get("collegeRestriction") or opp.get("college_restriction")
            if isinstance(eligible_orgs, list) and len(eligible_orgs) > 0:
                low_orgs = [str(x).strip().lower() for x in eligible_orgs if x]
                if not any("allow" in x or "all" in x for x in low_orgs):
                    applicant_college = str(application_data.get("college") or (user_profile or {}).get("college") or (user_profile or {}).get("institution") or "").strip().lower()
                    if not applicant_college or applicant_college not in low_orgs:
                        raise ValueError("Your college/organization is not eligible to apply for this opportunity")
            elif isinstance(college_restr, str) and college_restr.strip().lower() not in ("everyone", "allow all", "allow all organizations"):
                # collegeRestriction may be a short string describing allowed orgs; fail closed if it's not permissive
                appl_coll = str(application_data.get("college") or (user_profile or {}).get("college") or "").strip().lower()
                if not appl_coll or college_restr.strip().lower() not in appl_coll:
                    raise ValueError("Your college/organization is not eligible to apply for this opportunity")

            # Gender restriction
            eligible_genders = opp.get("eligibleGenders") or opp.get("eligible_genders") or []
            gender_restr = opp.get("genderRestriction") or opp.get("gender_restriction")
            if isinstance(eligible_genders, list) and len(eligible_genders) > 0:
                low_g = [str(x).strip().lower() for x in eligible_genders if x]
                if not any("allow" in x or "all" in x for x in low_g):
                    applicant_gender = str(application_data.get("gender") or (user_profile or {}).get("gender") or "").strip().lower()
                    if not applicant_gender or applicant_gender not in low_g:
                        raise ValueError("You do not meet the gender eligibility for this opportunity")
            elif isinstance(gender_restr, str) and gender_restr.strip().lower() not in ("everyone", "all"):
                appl_gender = str(application_data.get("gender") or (user_profile or {}).get("gender") or "").strip().lower()
                if not appl_gender or gender_restr.strip().lower() not in appl_gender:
                    raise ValueError("You do not meet the gender eligibility for this opportunity")

            # Participation type enforcement on portal applications
            ptype = str(opp.get("participationType") or opp.get("participation_type") or "both").strip().lower()
            if ptype == "individual" and (application_data.get("team_id") or application_data.get("teamMembers") or application_data.get("team_members")):
                raise ValueError("This opportunity accepts individual applications only")
            if ptype == "team":
                # Expect application to include team details (simple check)
                members = application_data.get("teamMembers") or application_data.get("team_members") or []
                if not members or not isinstance(members, list) or len(members) == 0:
                    raise ValueError("This opportunity requires team applications. Provide team members to apply.")
                # Validate team size strictly from opportunity config
                min_raw = opp.get("minTeamSize") if opp else None
                if min_raw is None and opp:
                    min_raw = opp.get("min_team_size")
                max_raw = opp.get("maxTeamSize") if opp else None
                if max_raw is None and opp:
                    max_raw = opp.get("max_team_size")
                if min_raw is None or max_raw is None:
                    raise ValueError("Team size is not configured for this opportunity")
                min_ts = int(min_raw)
                max_ts = int(max_raw)
                if len(members) < min_ts:
                    raise ValueError(f"Team must have at least {min_ts} members to apply")
                if len(members) > max_ts:
                    raise ValueError(f"Team must have at most {max_ts} members to apply")
            # Enforce registration deadline - with better error handling
            deadline = opp.get("deadline")
            if deadline:
                if isinstance(deadline, str):
                    try:
                        # Use _safe_dt for robust conversion
                        deadline = _safe_dt(deadline)
                    except:
                        deadline = None
                
                if deadline:
                    try:
                        # Ensure we include the full day if it's just a date
                        # If it has no time info, set to 23:59:59
                        deadline_dt = deadline.replace(tzinfo=None)
                        if deadline_dt.hour == 0 and deadline_dt.minute == 0:
                            deadline_dt = deadline_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
                            
                        if datetime.utcnow() > deadline_dt:
                            raise ValueError("Registration deadline has passed")
                    except Exception as e:
                        print(f"Deadline validation error: {e}")
                        # Continue with application if deadline validation fails

    if oid and uid:
        existing = await opportunity_applications_col.find_one(
            {"opportunity_id": oid, "user_id": uid}
        )
        if existing:
            existing["_id"] = str(existing["_id"])
            return existing

    application_data["applied_at"] = datetime.utcnow()
    application_data["status"] = "pending"

    result = await opportunity_applications_col.insert_one(application_data)
    app_id_str = str(result.inserted_id)

    await opportunities_col.update_one(
        {"_id": ObjectId(oid)},
        {"$inc": {"applicantsCount": 1}},
    )

    # Mirror into participants_col when this opportunity is tied to an event (institution dashboards).
    try:
        opp = await opportunities_col.find_one({"_id": ObjectId(oid)})
        eid = opp.get("event_link_id") if opp else None
        if eid and uid:
            ev = await events_col.find_one({"_id": ObjectId(str(eid))})
            if ev:
                inst = application_data.get("institution_id") or ev.get("institution_id")
                dup = await participants_col.find_one({"event_id": str(eid), "user_id": uid})
                if not dup:
                    # Set initial stage if the host defined stages.
                    first_stage = None
                    try:
                        st = ev.get("stages")
                        if isinstance(st, list) and st:
                            first_stage = st[0].get("name") or st[0].get("id")
                    except Exception:
                        first_stage = None
                    await participants_col.insert_one(
                        {
                            "event_id": str(eid),
                            "institution_id": inst,
                            "user_id": uid,
                            "full_name": application_data.get("name"),
                            "name": application_data.get("name"),
                            "email": application_data.get("email"),
                            "event_title": ev.get("title"),
                            "registered_at": application_data["applied_at"],
                            "status": "pending",
                            "current_stage": first_stage,
                            "resume_url": application_data.get("resume_url"),
                            "source": "opportunity_portal",
                            "opportunity_application_id": app_id_str,
                        }
                    )
    except Exception as e:
        print(f"[WARNING] Could not mirror participant for opportunity application: {e}")

    # Send Registration Confirmation Email
    try:
        user_email = application_data.get("email")
        user_name = application_data.get("name", "Participant")
        opp_title = opp.get("title", "the opportunity")
        if user_email:
            subj = f"Confirmed: You're registered for {opp_title}"
            body = get_registration_template(user_name, opp_title)
            asyncio.create_task(send_notification_email(user_email, subj, body))
    except Exception as e:
        print(f"Error sending registration email: {e}")

    application_data["_id"] = str(result.inserted_id)
    return application_data

async def get_user_applications(user_id: str) -> List[dict]:
    """All portal applications for a learner, with opportunity, host labels, and real-time status."""
    cursor = opportunity_applications_col.find({"user_id": user_id})
    applications = await cursor.to_list(length=1000)
    
    if not applications:
        return []
        
    # Batch-fetch all opportunities
    opp_ids = []
    for doc in applications:
        doc["_id"] = str(doc["_id"])
        oid = doc.get("opportunity_id")
        if oid:
            try:
                if ObjectId.is_valid(oid):
                    opp_ids.append(ObjectId(oid))
                else:
                    print(f"Invalid ObjectId found for opportunity_id: {oid}")
            except Exception as e:
                print(f"Error processing ObjectId {oid}: {e}")
                continue
            
    opp_map = {}
    if opp_ids:
        opp_list = await opportunities_col.find({"_id": {"$in": opp_ids}}).to_list(length=1000)
        opp_map = {str(opp["_id"]): opp for opp in opp_list}
        
    # Batch-fetch all participants for this user & these events
    event_ids = []
    for opp in opp_map.values():
        eid = opp.get("event_link_id")
        if eid:
            event_ids.append(str(eid))
            
    part_map = {}
    if event_ids:
        part_list = await participants_col.find({"user_id": user_id, "event_id": {"$in": event_ids}}).to_list(length=1000)
        part_map = {str(part["event_id"]): part for part in part_list}
        
    # Batch-fetch all institutions
    inst_keys = set()
    for opp in opp_map.values():
        inst_key = opp.get("institution_id") or opp.get("createdBy")
        if inst_key:
            inst_keys.add(str(inst_key))
            
    inst_map = {}
    if inst_keys:
        inst_list = await institutions_col.find({"institution_id": {"$in": list(inst_keys)}}).to_list(length=1000)
        inst_map = {str(inst["institution_id"]): inst for inst in inst_list}
        
    for doc in applications:
        oid = str(doc.get("opportunity_id") or "")
        opp = opp_map.get(oid)
        if opp:
            doc["opportunity_title"] = opp.get("title")
            doc["opportunity_type"] = opp.get("type")
            eid = opp.get("event_link_id")
            if eid:
                doc["event_id"] = str(eid)
                participant = part_map.get(str(eid))
                if participant:
                    doc["status"] = participant.get("status", doc.get("status"))
                    doc["current_stage"] = participant.get("current_stage", doc.get("current_stage"))
                    
            inst_key = opp.get("institution_id") or opp.get("createdBy")
            if inst_key:
                inst = inst_map.get(str(inst_key))
                if inst:
                    doc["institution_name"] = inst.get("name")
                    
    applications.sort(key=lambda x: str(x.get("applied_at") or x.get("reviewed_at") or ""), reverse=True)
    return applications


def _safe_dt(val):
    if not val:
        return None
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val
    try:
        # iso string (allow Z)
        dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


async def get_learner_opportunity_overview(user_id: str, limit: int = 8) -> dict:
    """Aggregated learner dashboard overview for portal opportunities.

    Returns only the data needed for widgets: next deadlines, stage hints, and status labels.
    """
    cap = max(1, min(int(limit), 50))
    apps = await get_user_applications(user_id)
    timeline = apps[: cap]

    if not apps:
        return {"upcoming": [], "timeline": []}

    # Batch-fetch all opportunities and events
    opp_ids = []
    for a in apps:
        oid = a.get("opportunity_id")
        if oid:
            try:
                if ObjectId.is_valid(oid):
                    opp_ids.append(ObjectId(oid))
                else:
                    print(f"Invalid ObjectId found for opportunity_id: {oid}")
            except Exception as e:
                print(f"Error processing ObjectId {oid}: {e}")
                continue

    opp_map = {}
    if opp_ids:
        opp_list = await opportunities_col.find({"_id": {"$in": opp_ids}}).to_list(length=1000)
        opp_map = {str(opp["_id"]): opp for opp in opp_list}

    event_ids = []
    for opp in opp_map.values():
        eid = opp.get("event_link_id")
        if eid and ObjectId.is_valid(eid):
            event_ids.append(ObjectId(str(eid)))

    event_map = {}
    if event_ids:
        event_list = await events_col.find({"_id": {"$in": event_ids}}).to_list(length=1000)
        event_map = {str(ev["_id"]): ev for ev in event_list}

    upcoming = []
    now = datetime.now(timezone.utc)
    for a in apps:
        oid = str(a.get("opportunity_id") or "")
        opp = opp_map.get(oid)
        if not opp:
            continue
        # Make a copy so we don't modify the mapped dict in place
        opp_copy = dict(opp)
        opp_copy["_id"] = str(opp_copy["_id"])

        eid = opp_copy.get("event_link_id")
        ev = event_map.get(str(eid)) if eid else None
        if ev:
            _apply_event_snapshot_to_opportunity(opp_copy, ev)

        next_deadline = _safe_dt(opp_copy.get("deadline"))
        next_label = "Registration deadline"
        stages = opp_copy.get("stages") if isinstance(opp_copy.get("stages"), list) else []
        for s in stages:
            if not isinstance(s, dict):
                continue
            cand = _safe_dt(s.get("deadline") or s.get("endDate") or s.get("end_date") or s.get("end") or s.get("end_time"))
            if cand and cand >= now and (not next_deadline or cand < next_deadline):
                next_deadline = cand
                next_label = str(s.get("name") or s.get("title") or "Stage deadline")

        if not next_deadline:
            continue
        if next_deadline < now:
            continue

        days_left = max(0, int(((next_deadline - now).total_seconds() + 86400 - 1) // 86400))
        upcoming.append(
            {
                "opportunity_id": opp_copy["_id"],
                "title": opp_copy.get("title"),
                "organization": opp_copy.get("organization") or opp_copy.get("institution_profile_name"),
                "type": opp_copy.get("type"),
                "status": a.get("status") or "pending",
                "next_deadline": next_deadline.isoformat(),
                "next_label": next_label,
                "days_left": days_left,
            }
        )

    upcoming.sort(key=lambda x: x.get("next_deadline") or "")
    upcoming = upcoming[: cap]

    return {"upcoming": upcoming, "timeline": timeline}


async def backfill_portal_participants_for_institution(institution_id: str) -> dict:
    """Create ``participants`` rows for existing portal applications (mirrored opps)."""
    inserted = 0
    ev_cursor = events_col.find({"institution_id": institution_id})
    async for ev in ev_cursor:
        eid = str(ev["_id"])
        opp = await opportunities_col.find_one({"event_link_id": eid})
        if not opp:
            continue
        oid = str(opp["_id"])
        inst = ev.get("institution_id")
        a_cursor = opportunity_applications_col.find({"opportunity_id": oid})
        async for app in a_cursor:
            uid = str(app.get("user_id") or "")
            if not uid:
                continue
            dup = await participants_col.find_one({"event_id": eid, "user_id": uid})
            if dup:
                continue
            await participants_col.insert_one(
                {
                    "event_id": eid,
                    "institution_id": app.get("institution_id") or inst,
                    "user_id": uid,
                    "full_name": app.get("name"),
                    "name": app.get("name"),
                    "email": app.get("email"),
                    "event_title": ev.get("title"),
                    "registered_at": app.get("applied_at") or datetime.utcnow(),
                    "status": app.get("status", "pending"),
                    "resume_url": app.get("resume_url"),
                    "source": "opportunity_portal_backfill",
                    "opportunity_application_id": str(app["_id"]),
                }
            )
            inserted += 1
    return {"status": "success", "participants_inserted": inserted}


_ALLOWED_APP_STATUSES = frozenset({"pending", "accepted", "rejected", "shortlisted"})


async def _institution_owns_opportunity(opp: dict, institution_id: str) -> bool:
    if not opp or not institution_id:
        return False
    if str(opp.get("createdBy") or "") == institution_id:
        return True
    if str(opp.get("institution_id") or "") == institution_id:
        return True
    eid = opp.get("event_link_id")
    if not eid:
        return False
    try:
        ev = await events_col.find_one({"_id": ObjectId(str(eid))})
    except Exception:
        ev = None
    return bool(ev and str(ev.get("institution_id") or "") == institution_id)


async def set_opportunity_application_review_status(
    institution_id: str,
    new_status: str,
    application_id: Optional[str] = None,
    user_id: Optional[str] = None,
    opportunity_id: Optional[str] = None,
) -> Optional[dict]:
    """Institution updates portal application status; mirrors to ``participants`` when linked to an event."""
    import logging
    logger = logging.getLogger("opportunity_service")

    st = (new_status or "pending").strip().lower()
    logger.info(f"Attempting to set status to '{st}' for app_id: {application_id}")
    
    if st not in _ALLOWED_APP_STATUSES:
        logger.error(f"Invalid status '{st}' provided.")
        raise ValueError("Invalid status")

    app = None
    if application_id:
        try:
            app = await opportunity_applications_col.find_one({"_id": ObjectId(str(application_id))})
        except Exception as e:
            logger.error(f"Error finding application by ID {application_id}: {e}")
            app = None
    elif user_id and opportunity_id:
        app = await opportunity_applications_col.find_one(
            {"user_id": str(user_id), "opportunity_id": str(opportunity_id)}
        )

    if not app:
        logger.error(f"Application not found for app_id: {application_id} or user/opp combo.")
        return None

    oid = str(app.get("opportunity_id") or "")
    if not oid:
        logger.error(f"Application {app['_id']} is missing 'opportunity_id'.")
        return None

    opp = await opportunities_col.find_one({"_id": ObjectId(oid)})
    if not await _institution_owns_opportunity(opp, institution_id):
        logger.error(f"Permission denied: Inst {institution_id} does not own opp {oid}.")
        raise PermissionError("Institution not authorized for this application")

    update_result_app = await opportunity_applications_col.update_one(
        {"_id": app["_id"]},
        {"$set": {"status": st, "reviewed_at": datetime.utcnow()}},
    )
    logger.info(f"Updated opportunity_applications_col for {app['_id']}: {update_result_app.modified_count} modified.")

    uid = str(app.get("user_id") or "")
    eid = opp.get("event_link_id") if opp else None
    if eid and uid:
        update_result_part = await participants_col.update_many(
            {"event_id": str(eid), "user_id": uid},
            {"$set": {"status": st}},
        )
        logger.info(f"Synced status to participants_col for event {eid} / user {uid}: {update_result_part.modified_count} modified.")

    app["status"] = st
    app["_id"] = str(app["_id"])
    try:
        await _notify_portal_review(dict(app), opp or {}, st)
    except Exception as e:
        logger.error(f"Failed to send notification for app {app['_id']}: {e}")
    
    return app

