import os
import asyncio
from fastapi import APIRouter, HTTPException, Body, Depends, Query
from typing import Optional
from bson import ObjectId
from datetime import datetime, timezone
from auth_institution import get_auth_user, get_auth_user_optional

from db import (
    career_assessments_col, career_assessment_templates_col, career_goals_col, assessment_questions_col,
    blogs_col, learning_tracks_col,
    company_questions_col, partners_col, partner_talent_pool_col,
    job_simulations_col, gd_topics_col,
    gamification_col, user_gamification_col, user_stats_col,
    users_col, companies_col
)

router = APIRouter(prefix="/api/student", tags=["Student Features"])

from utils.db_helpers import fix_id
from services.rule_based_evaluator import evaluate_answer

# ─── CAREER GOALS ──────────────────────────────────────────────────────────────

@router.post("/goals")
async def set_career_goal(data: dict = Body(...), user: dict = Depends(get_auth_user)):
    goal = {
        "user_id": user.get("user_id"),
        "goal": data.get("goal"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await career_goals_col.update_one(
        {"user_id": user.get("user_id")},
        {"$set": goal},
        upsert=True
    )
    return {"status": "success", "goal": goal}

@router.get("/goals")
async def get_career_goal(user: dict = Depends(get_auth_user)):
    goal = await career_goals_col.find_one({"user_id": user.get("user_id")})
    if goal:
        return fix_id(goal)
    return None


# ─── CAREER ASSESSMENT (CareerFit) ─────────────────────────────────────────────

@router.get("/career-assessment/questions")
async def get_career_assessment_questions():
    # Read templates from dedicated templates collection to avoid returning user result documents
    cursor = career_assessment_templates_col.find({}).sort("order", 1)
    questions = [fix_id(q) async for q in cursor]
    if not questions:
        # Fallback default templates
        questions = [
            {
                "step": 1,
                "title": "Choose your problem space",
                "question": "What type of engineering challenges excite you most?",
                "options": [
                    {"label": "Distributed Systems & Infrastructure", "value": "distributed", "roles": ["Backend Architect", "DevOps Engineer", "Platform Engineer"]},
                    {"label": "Data Orchestration & Pipelines", "value": "data", "roles": ["Data Engineer", "ML Engineer", "Data Scientist"]},
                    {"label": "User Interaction & Experience", "value": "frontend", "roles": ["Frontend Engineer", "UI Engineer", "Full Stack Developer"]},
                    {"label": "ML Lifecycle & Intelligence", "value": "ml", "roles": ["ML Engineer", "AI Researcher", "NLP Engineer"]}
                ]
            },
            {
                "step": 2,
                "title": "Select your mental model",
                "question": "How do you approach problem-solving?",
                "options": [
                    {"label": "First principles — decompose to fundamentals", "value": "first_principles", "roles": ["Systems Architect", "Research Scientist"]},
                    {"label": "Pattern recognition — match known solutions", "value": "patterns", "roles": ["Full Stack Developer", "Backend Engineer"]},
                    {"label": "Iterative experimentation — build-measure-learn", "value": "iterative", "roles": ["Data Scientist", "ML Engineer"]},
                    {"label": "Design thinking — user-centric first", "value": "design", "roles": ["Frontend Engineer", "UX Engineer"]}
                ]
            },
            {
                "step": 3,
                "title": "Pick your tool preference",
                "question": "Which tool ecosystem do you gravitate toward?",
                "options": [
                    {"label": "Go / Rust / Kafka / k8s", "value": "infra", "roles": ["Backend Architect", "DevOps Engineer"]},
                    {"label": "Python / SQL / Spark / Airflow", "value": "data", "roles": ["Data Engineer", "Data Scientist"]},
                    {"label": "TypeScript / React / GraphQL", "value": "frontend", "roles": ["Frontend Engineer", "Full Stack Developer"]},
                    {"label": "Python / PyTorch / LangChain / CUDA", "value": "ai", "roles": ["ML Engineer", "AI Researcher"]}
                ]
            }
        ]
    return questions

@router.post("/career-assessment/result")
async def evaluate_career_assessment(data: dict = Body(...), user: dict = Depends(get_auth_user)):
    answers = data.get("answers", [])
    role_scores = {}
    for answer in answers:
        value = answer.get("value", "")
        q = await career_assessments_col.find_one({"step": answer.get("step")})
        if q:
            for opt in q.get("options", []):
                if opt.get("value") == value:
                    for r in opt.get("roles", []):
                        role_scores[r] = role_scores.get(r, 0) + 35
    if not role_scores:
        role_scores = {"Backend Architect": 94, "ML Engineer": 72, "Data Scientist": 65, "Frontend Engineer": 58}
    sorted_roles = sorted(role_scores.items(), key=lambda x: -x[1])
    result = {
        "user_id": user.get("user_id"),
        "answers": answers,
        "results": [{"role": r, "score": s} for r, s in sorted_roles],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await career_assessments_col.insert_one(result)
    await user_stats_col.update_one(
        {"user_id": user.get("user_id")},
        {"$set": {"career_assessment_taken": True, "top_roles": [r["role"] for r in result["results"][:3]]}},
        upsert=True
    )
    return {"results": result["results"], "top_role": sorted_roles[0][0] if sorted_roles else None}


# ─── SKILL ASSESSMENT (Assessment.tsx) ─────────────────────────────────────────

@router.get("/assessment/companies")
async def get_assessment_companies():
    companies = await companies_col.find({}, {"_id": 1, "name": 1, "logo": 1}).to_list(100)
    if not companies:
        companies = [
            {"_id": "google", "name": "Google"},
            {"_id": "amazon", "name": "Amazon"},
            {"_id": "microsoft", "name": "Microsoft"},
            {"_id": "stripe", "name": "Stripe"}
        ]
    return [fix_id(c) if "_id" in c and isinstance(c["_id"], ObjectId) else c for c in companies]

@router.get("/assessment/roles")
async def get_assessment_roles():
    cursor = assessment_questions_col.distinct("role")
    roles = await cursor
    if not roles:
        roles = ["Backend Developer", "Frontend Developer", "Data Analyst", "ML Engineer"]
    return roles

@router.get("/assessment/questions")
async def get_assessment_questions(company: str = "", role: str = ""):
    query = {}
    if company:
        query["company"] = company
    if role:
        query["role"] = role
    cursor = assessment_questions_col.find(query)
    questions = [fix_id(q) async for q in cursor]
    if not questions:
        questions = [
            {"_id": "q1", "company": company or "general", "role": role or "general", "type": "mcq",
             "question": "What is the time complexity of binary search?",
             "options": ["O(n)", "O(log n)", "O(n²)", "O(1)"], "correctAnswer": 1,
             "explanation": "Binary search halves the search space each iteration, giving O(log n).",
             "difficulty": "easy"},
            {"_id": "q2", "company": company or "general", "role": role or "general", "type": "mcq",
             "question": "Which data structure uses FIFO order?",
             "options": ["Stack", "Queue", "Tree", "Graph"], "correctAnswer": 1,
             "explanation": "Queue follows First-In-First-Out order.",
             "difficulty": "easy"},
            {"_id": "q3", "company": company or "general", "role": role or "general", "type": "mcq",
             "question": "What does REST stand for?",
             "options": ["Representational State Transfer", "Remote State Transfer", "Representational System Transfer", "Remote System Transfer"],
             "correctAnswer": 0, "explanation": "REST stands for Representational State Transfer.",
             "difficulty": "easy"},
            {"_id": "q4", "company": company or "general", "role": role or "general", "type": "coding",
             "question": "Write a function to reverse a string.",
             "difficulty": "easy"},
            {"_id": "q5", "company": company or "general", "role": role or "general", "type": "mcq",
             "question": "What is the primary key in a database?",
             "options": ["A unique identifier for each row", "A foreign key reference", "An index", "A constraint on null values"],
             "correctAnswer": 0, "explanation": "A primary key uniquely identifies each row in a table.",
             "difficulty": "medium"},
            {"_id": "q6", "company": company or "general", "role": role or "general", "type": "mcq",
             "question": "Which of the following is not a JavaScript data type?",
             "options": ["String", "Number", "Float", "Boolean"], "correctAnswer": 2,
             "explanation": "JavaScript uses 'Number' for all numeric types; 'Float' is not a separate type.",
             "difficulty": "easy"}
        ]
    return questions

@router.post("/assessment/submit")
async def submit_assessment(data: dict = Body(...), user: dict = Depends(get_auth_user)):
    questions = data.get("questions", [])
    answers = data.get("answers", [])
    correct = 0
    results = []
    for i, q in enumerate(questions):
        user_ans = answers[i] if i < len(answers) else None
        is_correct = q.get("correctAnswer") is not None and user_ans == q.get("correctAnswer")
        if is_correct:
            correct += 1
        results.append({
            "question": q.get("question"),
            "userAnswer": user_ans,
            "correctAnswer": q.get("correctAnswer"),
            "isCorrect": is_correct,
            "explanation": q.get("explanation", "")
        })
    total = len(questions)
    score = round((correct / total) * 100) if total > 0 else 0
    submission = {
        "user_id": user.get("user_id"),
        "company": data.get("company"),
        "role": data.get("role"),
        "score": score,
        "correct": correct,
        "total": total,
        "results": results,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await assessment_questions_col.insert_one(submission)
    await user_stats_col.update_one(
        {"user_id": user.get("user_id")},
        {"$set": {"last_assessment_score": score, "last_assessment_role": data.get("role")}},
        upsert=True
    )
    return {"score": score, "correct": correct, "total": total, "results": results}

@router.post("/assessment/submit-v2")
async def submit_assessment_v2(data: dict = Body(...), user: dict = Depends(get_auth_user_optional)):
    if user is None:
        if os.getenv("ALLOW_LOCAL_AUTH_BYPASS", "false").lower() == "true":
            user = {"user_id": "local-test-user"}
        else:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
    questions = data.get("questions", [])
    answers = data.get("answers", [])
    correct = 0
    results = []
    total_score_sum = 0
    
    for i, q in enumerate(questions):
        user_ans = answers[i] if i < len(answers) else None
        q_type = q.get("type", "mcq")
        
        if q_type == "mcq":
            is_correct = q.get("correctAnswer") is not None and user_ans == q.get("correctAnswer")
            if is_correct:
                correct += 1
                total_score_sum += 100
            results.append({
                "question": q.get("question"),
                "userAnswer": user_ans,
                "correctAnswer": q.get("correctAnswer"),
                "isCorrect": is_correct,
                "explanation": q.get("explanation", ""),
                "evalType": "mcq"
            })
        else:
            # Deterministic AI Evaluation
            eval_res = evaluate_answer(
                question=q.get("question", ""),
                user_answer=str(user_ans) if user_ans else "",
                question_type=q_type,
                expected_answer=q.get("explanation", "")
            )
            score_val = eval_res.get("score", 0)
            total_score_sum += score_val
            
            results.append({
                "question": q.get("question"),
                "userAnswer": user_ans,
                "evalType": "ai",
                "aiScore": score_val,
                "strengths": eval_res.get("strengths", []),
                "gaps": eval_res.get("gaps", []),
                "verdict": eval_res.get("verdict", "FAIL"),
                "idealApproach": eval_res.get("ideal_approach", "")
            })
            
    total = len(questions)
    final_score = round(total_score_sum / total) if total > 0 else 0
    
    submission = {
        "user_id": user.get("user_id"),
        "company": data.get("company"),
        "role": data.get("role"),
        "score": final_score,
        "correct_mcqs": correct,
        "total": total,
        "results": results,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await assessment_questions_col.insert_one(submission)
    await user_stats_col.update_one(
        {"user_id": user.get("user_id")},
        {"$set": {"last_assessment_score": final_score, "last_assessment_role": data.get("role")}},
        upsert=True
    )
    
    return {"score": final_score, "total": total, "results": results}

# ─── BLOG ──────────────────────────────────────────────────────────────────────

@router.get("/blogs")
async def list_blogs():
    cursor = blogs_col.find().sort("created_at", -1)
    blogs = [fix_id(b) async for b in cursor]
    if not blogs:
        blogs = [
            {"_id": "1", "title": "Mastering System Design Interviews", "category": "Interviews",
             "excerpt": "Learn the essential patterns and frameworks to ace your next system design interview at top tech companies.",
             "content": "## Mastering System Design Interviews\n\nSystem design interviews test your ability to build large-scale distributed systems...\n\n### Key Principles\n1. **Understand Requirements** — Always clarify functional and non-functional requirements first.\n2. **Estimate Scale** — Traffic, storage, bandwidth estimates guide your architecture.\n3. **Design Data Model** — Schema design is the foundation of any system.\n4. **High-Level Design** — Start simple, then iterate.\n\n### Common Questions\n- Design URL shortener (tinyurl)\n- Design WhatsApp\n- Design Netflix\n- Design Uber",
             "author": "Studlyf Team", "readTime": "5 min",
             "image": "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800",
             "created_at": datetime.now(timezone.utc).isoformat()},
            {"_id": "2", "title": "The Ultimate Guide to DSA Preparation", "category": "DSA",
             "excerpt": "A structured approach to mastering Data Structures and Algorithms for coding interviews.",
             "content": "## DSA Preparation Guide\n\nData Structures and Algorithms are the backbone of technical interviews...\n\n### Study Plan\n1. Arrays & Strings — 2 weeks\n2. Linked Lists — 1 week\n3. Trees & Graphs — 2 weeks\n4. Dynamic Programming — 3 weeks\n5. System Design — 2 weeks",
             "author": "Studlyf Team", "readTime": "8 min",
             "image": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800",
             "created_at": datetime.now(timezone.utc).isoformat()},
            {"_id": "3", "title": "How to Build an Outstanding Tech Portfolio", "category": "Career",
             "excerpt": "Stand out from the crowd with a portfolio that showcases your best work and technical skills.",
             "content": "## Building Your Tech Portfolio\n\nA strong portfolio can make the difference between getting an interview or being overlooked...\n\n### What to Include\n- Projects with real-world impact\n- Open source contributions\n- Technical blog posts\n- System design case studies",
             "author": "Studlyf Team", "readTime": "4 min",
             "image": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
             "created_at": datetime.now(timezone.utc).isoformat()},
            {"_id": "4", "title": "Cracking the FAANG Interview: What I Learned", "category": "Career",
             "excerpt": "First-hand insights and strategies from someone who successfully navigated the FAANG interview process.",
             "content": "## FAANG Interview Experience\n\nAfter interviewing at Google, Amazon, and Microsoft, here are my key takeaways...\n\n### Preparation Strategy\n- Start 3 months before\n- Focus on fundamentals, not memorization\n- Practice mock interviews weekly\n- Study system design patterns",
             "author": "Studlyf Team", "readTime": "6 min",
             "image": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800",
             "created_at": datetime.now(timezone.utc).isoformat()}
        ]
    return blogs

@router.get("/blogs/{blog_id}")
async def get_blog(blog_id: str):
    b = await blogs_col.find_one({"_id": (ObjectId(blog_id) if ObjectId.is_valid(blog_id) else blog_id) if len(blog_id) == 24 else blog_id})
    if not b:
        blogs = await list_blogs()
        for blog in blogs:
            if blog.get("_id") == blog_id:
                return blog
        raise HTTPException(status_code=404, detail="Blog not found")
    return fix_id(b)


# ─── LEARNING TRACKS (TrackDetail) ─────────────────────────────────────────────

@router.get("/tracks")
async def list_tracks():
    cursor = learning_tracks_col.find()
    tracks = [fix_id(t) async for t in cursor]
    if not tracks:
        tracks = [
            {"_id": "ai", "slug": "ai", "title": "Artificial Intelligence", "color": "#8B5CF6", "icon": "Brain",
             "description": "Master AI/ML from fundamentals to production deployment. Build neural networks, LLMs, and computer vision systems.",
             "outcomes": ["Build and deploy production ML models", "Master deep learning with PyTorch & TensorFlow",
                          "Design and fine-tune LLMs", "Implement computer vision pipelines"],
             "stats": {"duration": "6 Months", "projects": 12, "hours": "240+", "learners": "2,500+"},
             "roadmap": ["Python for ML", "Linear Algebra & Calculus", "Probability & Statistics",
                         "Machine Learning Fundamentals", "Deep Learning", "NLP & LLMs", "MLOps & Deployment"],
             "price": 4999, "rating": 4.8, "enrolled": 2500},
            {"_id": "swe", "slug": "swe", "title": "Software Engineering", "color": "#3B82F6", "icon": "Code",
             "description": "Become a production-ready software engineer. Master system design, distributed systems, and clean architecture.",
             "outcomes": ["Design scalable distributed systems", "Master system design interviews",
                          "Write production-grade code", "Lead technical architecture decisions"],
             "stats": {"duration": "4 Months", "projects": 10, "hours": "180+", "learners": "3,200+"},
             "roadmap": ["Data Structures & Algorithms", "System Design Fundamentals",
                         "Distributed Systems", "Microservices Architecture", "Cloud & DevOps", "System Design Interview Prep"],
             "price": 3999, "rating": 4.9, "enrolled": 3200},
            {"_id": "data", "slug": "data", "title": "Data & Analytics", "color": "#10B981", "icon": "BarChart",
             "description": "Transform raw data into actionable insights. Learn data engineering, analytics engineering, and BI tools.",
             "outcomes": ["Build data pipelines from scratch", "Master SQL & data modeling",
                          "Create interactive dashboards", "Implement data warehousing solutions"],
             "stats": {"duration": "3 Months", "projects": 8, "hours": "120+", "learners": "1,800+"},
             "roadmap": ["SQL Mastery", "Python for Data", "Data Modeling", "Data Warehousing", "ETL Pipelines", "BI & Visualization"],
             "price": 2999, "rating": 4.7, "enrolled": 1800},
            {"_id": "pm", "slug": "pm", "title": "Product Management", "color": "#F59E0B", "icon": "Target",
             "description": "Learn to lead product strategy, drive user research, and ship products that users love.",
             "outcomes": ["Define product vision and strategy", "Conduct user research and validation",
                          "Write PRDs and manage backlogs", "Lead cross-functional teams"],
             "stats": {"duration": "3 Months", "projects": 6, "hours": "100+", "learners": "1,200+"},
             "roadmap": ["Product Thinking", "User Research", "Product Strategy", "Agile & Scrum", "Data-Driven Decisions", "Go-To-Market"],
             "price": 2999, "rating": 4.6, "enrolled": 1200},
            {"_id": "cyber", "slug": "cyber", "title": "Cyber Security", "color": "#EF4444", "icon": "Shield",
             "description": "Protect systems and data from cyber threats. Learn ethical hacking, network security, and incident response.",
             "outcomes": ["Identify and mitigate security vulnerabilities", "Perform penetration testing",
                          "Implement security best practices", "Respond to security incidents"],
             "stats": {"duration": "4 Months", "projects": 8, "hours": "160+", "learners": "900+"},
             "roadmap": ["Network Security", "Web Application Security", "Ethical Hacking", "Cryptography", "Incident Response", "Compliance & Governance"],
             "price": 4499, "rating": 4.8, "enrolled": 900}
        ]
    return tracks

@router.get("/tracks/{slug}")
async def get_track(slug: str):
    t = await learning_tracks_col.find_one({"slug": slug})
    if t:
        return fix_id(t)
    tracks = await list_tracks()
    for track in tracks:
        if track.get("slug") == slug:
            return track
    raise HTTPException(status_code=404, detail="Track not found")

@router.get("/tracks/{slug}/enroll")
async def enroll_track(slug: str, user: dict = Depends(get_auth_user)):
    track = await get_track(slug)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    await learning_tracks_col.update_one(
        {"slug": slug},
        {"$inc": {"enrolled": 1}}
    )
    return {"status": "success", "track": slug}


# ─── COMPANY QUESTIONS (CompanyModules) ────────────────────────────────────────

@router.get("/company-questions")
async def get_company_questions(company: str = ""):
    query = {}
    if company:
        query["company"] = company
    cursor = company_questions_col.find(query)
    data = [fix_id(d) async for d in cursor]
    if not data:
        data = [
            {"company": "Google", "category": "DSA",
             "questions": [
                 {"title": "Two Sum", "difficulty": "Easy", "frequency": 95,
                  "description": "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.",
                  "topics": ["Array", "Hash Table"]},
                 {"title": "LRU Cache", "difficulty": "Medium", "frequency": 88,
                  "description": "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.",
                  "topics": ["Hash Table", "Linked List", "Design"]},
                 {"title": "Merge K Sorted Lists", "difficulty": "Hard", "frequency": 82,
                  "description": "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list.",
                  "topics": ["Linked List", "Divide and Conquer", "Heap"]}
             ]},
            {"company": "Google", "category": "Tech",
             "questions": [
                 {"title": "Explain MapReduce", "difficulty": "Medium",
                  "description": "Explain the MapReduce programming model and how it enables distributed data processing."},
                 {"title": "Design a Web Crawler", "difficulty": "Hard",
                  "description": "Design a distributed web crawler that can crawl the entire web efficiently."}
             ]},
            {"company": "Amazon", "category": "DSA",
             "questions": [
                 {"title": "Maximum Subarray", "difficulty": "Medium", "frequency": 92,
                  "description": "Given an integer array nums, find the subarray with the largest sum, and return its sum.",
                  "topics": ["Array", "Divide and Conquer", "DP"]},
                 {"title": "Design a File System", "difficulty": "Hard", "frequency": 75,
                  "description": "Design an in-memory file system with create, read, write, and delete operations.",
                  "topics": ["Trie", "Design"]}
             ]},
            {"company": "Amazon", "category": "Tech",
             "questions": [
                 {"title": "Explain DynamoDB Partitioning", "difficulty": "Medium",
                  "description": "How does DynamoDB partition data across servers? Explain partition keys and distribution."},
                 {"title": "Design Amazon Cart", "difficulty": "Hard",
                  "description": "Design the shopping cart system for Amazon handling millions of concurrent users."}
             ]}
        ]
    return data


# ─── PARTNER DASHBOARD ─────────────────────────────────────────────────────────

@router.get("/partner/talent-pool")
async def get_partner_talent_pool(user: dict = Depends(get_auth_user)):
    cursor = partner_talent_pool_col.find().sort("match_score", -1).limit(20)
    pool = [fix_id(p) async for p in cursor]
    if not pool:
        pool = [
            {"name": "Sarah Johnson", "role": "Full Stack Developer", "experience": "3 years",
             "skills": ["React", "Node.js", "Python", "AWS"], "match_score": 94, "status": "Available",
             "avatar": "https://i.pravatar.cc/40?u=sarah"},
            {"name": "James Wilson", "role": "Backend Engineer", "experience": "5 years",
             "skills": ["Go", "Kubernetes", "PostgreSQL", "Kafka"], "match_score": 89, "status": "Interviewing",
             "avatar": "https://i.pravatar.cc/40?u=james"},
            {"name": "Alex Chen", "role": "Data Scientist", "experience": "2 years",
             "skills": ["Python", "TensorFlow", "SQL", "Spark"], "match_score": 85, "status": "Available",
             "avatar": "https://i.pravatar.cc/40?u=alex"}
        ]
    return pool

@router.get("/partner/analytics")
async def get_partner_analytics(user: dict = Depends(get_auth_user)):
    total = await partner_talent_pool_col.count_documents({})
    verified = await partner_talent_pool_col.count_documents({"status": "Available"})
    interviews = await partner_talent_pool_col.count_documents({"status": "Interviewing"})
    if total == 0:
        return {"candidates_screened": 1250, "verified_matches": 847, "interviews_saved": 312}
    return {"candidates_screened": total, "verified_matches": verified, "interviews_saved": interviews}

@router.get("/partner/profile")
async def get_partner_profile(user: dict = Depends(get_auth_user)):
    profile = await partners_col.find_one({"user_id": user.get("user_id")})
    if not profile:
        profile = {"company": "Tech Corp", "role": "Hiring Manager", "email": user.get("email")}
    return fix_id(profile) if "_id" in profile else profile


# ─── JOB SIMULATIONS ───────────────────────────────────────────────────────────

@router.get("/simulations")
async def list_simulations():
    cursor = job_simulations_col.find().sort("difficulty", 1)
    missions = [fix_id(m) async for m in cursor]
    if not missions:
        missions = [
            {"_id": "1", "title": "Resilience Audit", "company": "Nirvaha", "difficulty": "Elite",
             "description": "Identify and fix single points of failure in a critical payment processing pipeline during peak traffic.",
             "objectives": ["Identify SPOFs in architecture", "Design failover strategy", "Implement circuit breaker"],
             "duration": "45 min", "xp_reward": 500},
            {"_id": "2", "title": "Scale Deployment", "company": "DataFlow", "difficulty": "High",
             "description": "Design and implement a deployment strategy for a data pipeline processing 10x current load.",
             "objectives": ["Design horizontal scaling strategy", "Implement auto-scaling rules", "Optimize DB connection pooling"],
             "duration": "35 min", "xp_reward": 350},
            {"_id": "3", "title": "Security Breach", "company": "Logic", "difficulty": "Critical",
             "description": "Respond to an active security breach: identify the attack vector, contain the damage, and implement fixes.",
             "objectives": ["Identify attack vector", "Contain the breach", "Implement security patches", "Write incident report"],
             "duration": "50 min", "xp_reward": 700}
        ]
    return missions


# ─── GROUP DISCUSSION ──────────────────────────────────────────────────────────

@router.get("/gd-topics")
async def list_gd_topics():
    cursor = gd_topics_col.find().sort("created_at", -1)
    topics = [fix_id(t) async for t in cursor]
    if not topics:
        topics = [
            {"_id": "1", "title": "Centralization vs Decentralization",
             "description": "Explore the trade-offs between centralized and decentralized system architectures.",
             "difficulty": "Advanced", "duration": "20 min", "tags": ["System Design", "Architecture"]},
            {"_id": "2", "title": "Microservices vs Monolith",
             "description": "Debate when to use microservices vs monolithic architecture in different contexts.",
             "difficulty": "Intermediate", "duration": "20 min", "tags": ["Architecture", "Backend"]},
            {"_id": "3", "title": "AI Ethics & Responsibility",
             "description": "Discuss the ethical implications of AI in hiring, healthcare, and autonomous systems.",
             "difficulty": "Advanced", "duration": "25 min", "tags": ["AI", "Ethics"]},
            {"_id": "4", "title": "Future of Remote Work",
             "description": "Analyze the long-term impact of remote work on engineering teams and company culture.",
             "difficulty": "Beginner", "duration": "15 min", "tags": ["Career", "Culture"]}
        ]
    return topics


# ─── GAMIFICATION (PlayLearnEarn) ──────────────────────────────────────────────

@router.get("/gamification")
async def get_gamification_data():
    config = await gamification_col.find_one({"_id": "config"})
    if not config:
        config = {
            "features": [
                {"title": "Daily Quizzes", "xp": 500, "description": "Test your knowledge daily with curated quizzes.",
                 "icon": "Zap", "color": "#F59E0B"},
                {"title": "Skill Challenges", "xp": 2000, "description": "Complete advanced challenges to master new skills.",
                 "icon": "Award", "color": "#8B5CF6"},
                {"title": "Reward Points", "xp": 0, "description": "Redeem XP for rewards, certificates, and exclusive content.",
                 "icon": "Gift", "color": "#10B981"}
            ],
            "cycle": {"current": 3, "total": 7, "label": "Protocol Cycle III"}
        }
    return config

@router.get("/gamification/user/{user_id}")
async def get_user_gamification(user_id: str):
    data = await user_gamification_col.find_one({"user_id": user_id})
    if not data:
        data = {"user_id": user_id, "xp": 0, "level": 1, "daily_streak": 0,
                "badges": [], "challenges_completed": 0}
    return data

@router.post("/gamification/xp")
async def add_xp(data: dict = Body(...), user: dict = Depends(get_auth_user)):
    amount = data.get("amount", 0)
    reason = data.get("reason", "")
    uid = user.get("user_id")
    now = datetime.now(timezone.utc).isoformat()
    await user_gamification_col.update_one(
        {"user_id": uid},
        {"$inc": {"xp": amount, "challenges_completed": 1 if "challenge" in reason else 0},
         "$set": {"last_updated": now}},
        upsert=True
    )
    record = await user_gamification_col.find_one({"user_id": uid})
    level = 1 + (record.get("xp", 0) // 1000) if record else 1
    await user_gamification_col.update_one({"user_id": uid}, {"$set": {"level": level}})
    return {"xp": record.get("xp", 0) + amount if record else amount, "level": level}


# ─── AGGREGATED DASHBOARD ──────────────────────────────────────────────────────

@router.get("/dashboard-summary")
async def get_dashboard_summary(user: dict = Depends(get_auth_user)):
    user_id = user.get("user_id")
    from db import certificates_col, resumes_col, enrollments_col, skill_assessments_col
    
    # Define parallel tasks
    tasks = [
        user_stats_col.find_one({"user_id": user_id}),
        users_col.find_one({"user_id": user_id}),
        certificates_col.count_documents({"user_id": user_id}) if certificates_col is not None else 0,
        resumes_col.find_one({"user_id": user_id}) if resumes_col is not None else None,
        enrollments_col.count_documents({"user_id": user_id}) if enrollments_col is not None else 0,
        skill_assessments_col.count_documents({"user_id": user_id}) if skill_assessments_col is not None else 0
    ]
    
    # Execute in parallel
    results = await asyncio.gather(*tasks)
    stats, profile, cert_count, resume_doc, course_count, skill_count = results
    
    if not stats:
        # Calculate dynamic values if stats document doesn't exist
        profile_strength = 0
        if profile:
            if profile.get("full_name"): profile_strength += 25
            if profile.get("college_name"): profile_strength += 25
            if resume_doc: profile_strength += 25
            if cert_count > 0: profile_strength += 25
        else:
            profile_strength = 88 # Default fallback
            
        stats = {
            "profile_strength": profile_strength,
            "course_progress": min(course_count * 20, 100),
            "skill_assessments": skill_count,
            "global_rank": 42, # Needs separate leaderboard logic
            "certificates": cert_count,
            "resume_exists": resume_doc is not None,
            "courses_enrolled": course_count,
            "top_roles": []
        }
    else:
        # Ensure stats doc has current dynamic counts if they differ
        stats["certificates"] = cert_count
        stats["courses_enrolled"] = course_count
        stats["skill_assessments"] = skill_count
        stats["resume_exists"] = resume_doc is not None
    
    return fix_id(stats)

# ─── USER STATS / LEARNER DASHBOARD ────────────────────────────────────────────

@router.get("/stats/{user_id}")
async def get_user_stats(user_id: str):
    # This is kept for backward compatibility but calls the new logic if possible
    # In a real refactor, we would redirect or replace this call in the frontend
    stats = await user_stats_col.find_one({"user_id": user_id})
    if not stats:
        from db import certificates_col, resumes_col, enrollments_col
        tasks = [
            users_col.find_one({"user_id": user_id}),
            certificates_col.count_documents({"user_id": user_id}) if certificates_col is not None else 0,
            resumes_col.find_one({"user_id": user_id}) if resumes_col is not None else None,
            enrollments_col.count_documents({"user_id": user_id}) if enrollments_col is not None else 0
        ]
        results = await asyncio.gather(*tasks)
        profile, cert_count, resume_doc, course_count = results
        
        stats = {
            "profile_strength": 88,
            "course_progress": min(course_count * 20, 100),
            "skill_assessments": 0,
            "global_rank": 42,
            "certificates": cert_count,
            "resume_exists": resume_doc is not None,
            "courses_enrolled": course_count,
            "top_roles": []
        }
    return fix_id(stats)
