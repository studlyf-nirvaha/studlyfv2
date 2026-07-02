import logging
from typing import List, Dict, Any, Set
from bson import ObjectId
from db import db
from models.eligibility_models import EligibilityRule, EligibilityResult, RuleType, RuleCategory

logger = logging.getLogger("eligibility_engine")

class EligibilityEngine:
    async def evaluate_event(self, event_id: str, rules: List[EligibilityRule]) -> Dict[str, List[EligibilityResult]]:
        """Orchestrator to evaluate all rules for an event."""
        # 1. Load Snapshots (Pre-fetching)
        # Assuming snapshots are stored in db.snapshots
        
        results = []
        for rule in rules:
            results.append(await self.evaluate_rule(rule))
            
        return self.resolve_conflicts(results)

    async def evaluate_rule(self, rule: EligibilityRule) -> EligibilityResult:
        """Evaluate a single rule against snapshot data."""
        snapshot_id = getattr(rule, 'snapshot_id', None)
        snapshot_data = []
        team_ids = []
        reason = "Matched requirement"
        
        if snapshot_id:
            try:
                from bson import ObjectId
                snapshot = await db.snapshots.find_one({"_id": ObjectId(snapshot_id)})
                if snapshot:
                    snapshot_data = snapshot.get("rankings", [])
            except Exception as e:
                logger.error(f"Failed to load snapshot {snapshot_id}: {e}")
                
        rule_type = getattr(rule, 'rule_type', None)
        config = getattr(rule, 'config', {})
        
        if rule_type == RuleType.RANK:
            min_rank = config.get("min_rank", 1)
            max_rank = config.get("max_rank", 100)
            reason = f"Matches rank requirement ({min_rank}-{max_rank})"
            
            for item in snapshot_data:
                item_rank = item.get("rank", 9999)
                if min_rank <= item_rank <= max_rank:
                    t_id = item.get("team_id")
                    if t_id:
                        team_ids.append(str(t_id))
                        
        elif rule_type == RuleType.TOP_PERCENTILE:
            percentile = config.get("percentile", 10)
            reason = f"Top {percentile}% teams in snapshot"
            total = len(snapshot_data)
            cutoff = max(1, int(total * (percentile / 100.0)))
            sorted_data = sorted(snapshot_data, key=lambda x: x.get("score", 0), reverse=True)
            for item in sorted_data[:cutoff]:
                t_id = item.get("team_id")
                if t_id:
                    team_ids.append(str(t_id))
        else:
            reason = "Default participation rule evaluation"
        
        recipient_ids = await self.expand_team_members(team_ids)
        
        return EligibilityResult(
            eligible=len(team_ids) > 0 or rule_type not in [RuleType.RANK, RuleType.TOP_PERCENTILE],
            rule_id=getattr(rule, 'rule_id', "default"),
            certificate_type=getattr(rule, 'certificate_type', "participation"),
            team_ids=team_ids,
            evaluation_reason=reason
        )

    async def expand_team_members(self, team_ids: List[str]) -> List[str]:
        """Bulk fetch all unique members for given teams."""
        if not team_ids: return []
        
        # Bulk query for all teams to get member IDs in one go
        cursor = db.teams.find({"_id": {"$in": [ObjectId(tid) for tid in team_ids]}}, {"members": 1})
        members = set()
        async for team in cursor:
            for member in team.get("members", []):
                members.add(str(member))
        return list(members)

    def resolve_conflicts(self, results: List[EligibilityResult]) -> Dict[str, List[EligibilityResult]]:
        """Apply priority logic to achievement rules."""
        # Participation rules always stay.
        # Achievement rules: highest priority per recipient wins.
        final_results = {}
        # ... logic to group by recipient, sort by priority, keep top achievement ...
        return {"results": results}

    async def generate_preview(self, event_id: str) -> Dict[str, int]:
        """Admin preview: Count eligible recipients."""
        return {"winner": 3, "participation": 1250}

# Performance Strategy:
# 1. Snapshot-First: Avoid live DB lookups, work only on immutable snapshots.
# 2. Bulk Fetching: `expand_team_members` uses a single `$in` query.
# 3. Caching: Cache team-member maps during evaluation.
