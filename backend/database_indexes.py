"""
DATABASE INDEXES & OPTIMIZATION
MongoDB indexes for production performance and querying
"""

import pymongo
from pymongo import ASCENDING, DESCENDING
import logging

logger = logging.getLogger(__name__)

class DatabaseIndexManager:
    """Manage MongoDB indexes for production"""
    
    def __init__(self, db):
        self.db = db
    
    async def create_all_indexes(self):
        """Create all required indexes on startup"""
        logger.info("Creating database indexes...")
        
        try:
            # Users collection
            await self._create_users_indexes()
            
            # Institutions collection
            await self._create_institutions_indexes()
            
            # Certificates collection
            await self._create_certificates_indexes()
            
            # Events collection
            await self._create_events_indexes()
            
            # Leaderboards collection
            await self._create_leaderboards_indexes()
            
            # Email deliveries collection
            await self._create_email_indexes()
            
            # Audit logs collection
            await self._create_audit_logs_indexes()
            
            logger.info("All indexes created successfully")
        
        except Exception as e:
            logger.error(f"Error creating indexes: {e}")
            raise
    
    async def _create_users_indexes(self):
        """Indexes for users collection"""
        users = self.db.users
        
        # Unique email index
        try:
            await users.create_index(
                "email",
                unique=True,
                sparse=True
            )
        except pymongo.errors.DuplicateKeyError:
            logger.warning("Email index already exists")
        
        # Institution lookup
        await users.create_index([("institution_id", ASCENDING)])
        
        # Compound index for searches
        await users.create_index([
            ("institution_id", ASCENDING),
            ("email", ASCENDING)
        ])
        
        # Sort by creation date
        await users.create_index([("created_at", DESCENDING)])
        
        # Status index
        await users.create_index([("status", ASCENDING)])
        
        logger.info("✓ Users indexes created")
    
    async def _create_institutions_indexes(self):
        """Indexes for institutions collection"""
        institutions = self.db.institutions
        
        # Unique name index
        try:
            await institutions.create_index(
                "name",
                unique=True,
                sparse=True
            )
        except pymongo.errors.DuplicateKeyError:
            logger.warning("Institution name index already exists")
        
        # Domain lookup
        try:
            await institutions.create_index(
                "domain",
                unique=True,
                sparse=True
            )
        except pymongo.errors.DuplicateKeyError:
            logger.warning("Domain index already exists")
        
        # Created by
        await institutions.create_index([("created_by", ASCENDING)])
        
        # Creation date
        await institutions.create_index([("created_at", DESCENDING)])
        
        logger.info("✓ Institutions indexes created")
    
    async def _create_certificates_indexes(self):
        """Indexes for certificates collection"""
        certificates = self.db.certificates
        
        # User lookup (most common query)
        await certificates.create_index([("user_id", ASCENDING)])
        
        # Institution lookup
        await certificates.create_index([("institution_id", ASCENDING)])
        
        # Compound index (most queries filter by both)
        await certificates.create_index([
            ("institution_id", ASCENDING),
            ("user_id", ASCENDING)
        ])
        
        # Status filtering
        await certificates.create_index([("status", ASCENDING)])
        
        # Date sorting
        await certificates.create_index([("issued_date", DESCENDING)])
        
        # Certificate code lookup (for verification)
        await certificates.create_index([
            ("certificate_code", ASCENDING)
        ], sparse=True)
        
        # Revocation lookup
        await certificates.create_index([
            ("institution_id", ASCENDING),
            ("status", ASCENDING),
            ("issued_date", DESCENDING)
        ])
        
        # TTL index for draft certificates (auto-delete after 7 days)
        await certificates.create_index(
            [("created_at", ASCENDING)],
            expireAfterSeconds=604800,
            partialFilterExpression={"status": "draft"}
        )
        
        logger.info("✓ Certificates indexes created")
    
    async def _create_events_indexes(self):
        """Indexes for events collection"""
        events = self.db.events
        
        # Institution lookup
        await events.create_index([("institution_id", ASCENDING)])
        
        # Date filtering (for upcoming events)
        await events.create_index([
            ("institution_id", ASCENDING),
            ("date", ASCENDING)
        ])
        
        # Status
        await events.create_index([
            ("institution_id", ASCENDING),
            ("status", ASCENDING)
        ])
        
        # Created by
        await events.create_index([("created_by", ASCENDING)])
        
        # Creation date
        await events.create_index([("created_at", DESCENDING)])
        
        logger.info("✓ Events indexes created")
    
    async def _create_leaderboards_indexes(self):
        """Indexes for leaderboards collection"""
        leaderboards = self.db.leaderboards
        
        # Event lookup
        await leaderboards.create_index([("event_id", ASCENDING)])
        
        # User lookup
        await leaderboards.create_index([("user_id", ASCENDING)])
        
        # Institution lookup
        await leaderboards.create_index([("institution_id", ASCENDING)])
        
        # Composite for leaderboard queries
        await leaderboards.create_index([
            ("event_id", ASCENDING),
            ("score", DESCENDING),
            ("user_id", ASCENDING)
        ])
        
        # Ranking
        await leaderboards.create_index([
            ("institution_id", ASCENDING),
            ("rank", ASCENDING)
        ])
        
        logger.info("✓ Leaderboards indexes created")
    
    async def _create_email_indexes(self):
        """Indexes for email_deliveries collection"""
        email = self.db.email_deliveries
        
        # Status (for retry logic)
        await email.create_index([("status", ASCENDING)])
        
        # Recipient
        await email.create_index([("recipient_email", ASCENDING)])
        
        # Creation date (for cleanup)
        await email.create_index([("created_at", DESCENDING)])
        
        # Compound for retry queries
        await email.create_index([
            ("status", ASCENDING),
            ("created_at", ASCENDING)
        ])
        
        # TTL index to auto-delete old emails (after 90 days)
        await email.create_index(
            [("created_at", ASCENDING)],
            expireAfterSeconds=7776000  # 90 days
        )
        
        logger.info("✓ Email indexes created")
    
    async def _create_audit_logs_indexes(self):
        """Indexes for audit_logs collection"""
        audit = self.db.audit_logs
        
        # Admin lookup
        await audit.create_index([("admin_id", ASCENDING)])
        
        # Institution lookup
        await audit.create_index([("institution_id", ASCENDING)])
        
        # Action type
        await audit.create_index([("action", ASCENDING)])
        
        # Timestamp (for sorting/filtering)
        await audit.create_index([("timestamp", DESCENDING)])
        
        # Composite for audit queries
        await audit.create_index([
            ("institution_id", ASCENDING),
            ("timestamp", DESCENDING)
        ])
        
        # TTL index to auto-delete old audit logs (after 1 year)
        await audit.create_index(
            [("timestamp", ASCENDING)],
            expireAfterSeconds=31536000  # 365 days
        )
        
        logger.info("✓ Audit logs indexes created")
    
    async def analyze_query_performance(self):
        """Analyze and report on query performance"""
        logger.info("Analyzing query performance...")
        
        collections = [
            "users",
            "institutions",
            "certificates",
            "events",
            "leaderboards",
            "email_deliveries",
            "audit_logs"
        ]
        
        for collection_name in collections:
            try:
                collection = self.db[collection_name]
                stats = await collection.index_information()
                count = await collection.count_documents({})
                
                logger.info(
                    f"Collection '{collection_name}': "
                    f"{count} documents, {len(stats)} indexes"
                )
                
                for index_name, index_info in stats.items():
                    logger.debug(f"  Index: {index_name} - {index_info['key']}")
            
            except Exception as e:
                logger.warning(f"Could not analyze {collection_name}: {e}")


# ========== INITIALIZATION CODE FOR main.py ==========

async def initialize_database(db):
    """
    Call this in your FastAPI startup event
    
    Usage:
        @app.on_event("startup")
        async def startup():
            await initialize_database(db)
    """
    index_manager = DatabaseIndexManager(db)
    await index_manager.create_all_indexes()
    await index_manager.analyze_query_performance()
    
    logger.info("Database initialization complete")


# ========== QUERY OPTIMIZATION HELPERS ==========

def build_optimized_leaderboard_query(event_id: str, limit: int = 100):
    """
    Build optimized query for leaderboard retrieval
    Uses compound index for efficiency
    """
    return [
        {
            "$match": {
                "event_id": event_id
            }
        },
        {
            "$sort": {
                "score": -1,
                "timestamp": 1
            }
        },
        {
            "$limit": limit
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user_data"
            }
        },
        {
            "$project": {
                "rank": {"$add": ["$_id", 1]},  # Simplified ranking
                "user_id": 1,
                "score": 1,
                "user_name": {"$arrayElemAt": ["$user_data.full_name", 0]},
                "user_email": {"$arrayElemAt": ["$user_data.email", 0]}
            }
        }
    ]

def build_optimized_certificate_search(institution_id: str, search_term: str):
    """
    Build optimized search query for certificates
    Uses compound index
    """
    return {
        "$and": [
            {"institution_id": institution_id},
            {
                "$or": [
                    {"name": {"$regex": search_term, "$options": "i"}},
                    {"recipient_name": {"$regex": search_term, "$options": "i"}},
                    {"certificate_code": {"$regex": search_term, "$options": "i"}}
                ]
            },
            {"status": {"$ne": "deleted"}}
        ]
    }

def build_pagination_options(page: int = 1, page_size: int = 20):
    """
    Build skip/limit for pagination
    """
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 20
    
    skip = (page - 1) * page_size
    
    return {
        "skip": skip,
        "limit": page_size
    }
