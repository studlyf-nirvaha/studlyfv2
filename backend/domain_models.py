from pydantic import BaseModel, Field
from typing import List, Optional, Union
from datetime import datetime, timezone

class Course(BaseModel):
    id: str = Field(..., alias="_id")
    title: str
    description: str
    role_tag: str  # Backend / Frontend / AI
    difficulty: str  # Beginner / Inter / Advanced
    image: Optional[str] = None
    skills: Optional[List[str]] = None
    duration: Optional[str] = None
    standard: Optional[str] = None
    school: Optional[str] = None
    # Marketplace fields
    price: float = 0.0
    rating: float = 4.5
    total_reviews: int = 0
    total_hours: float = 0.0
    category: Optional[str] = None
    level: Optional[str] = None  # Beginner / Intermediate / Advanced
    key_topics: Optional[List[str]] = None
    last_updated: Optional[str] = None
    instructor: Optional[str] = None
    instructor_name: Optional[str] = None
    instructor_image: Optional[str] = None
    instructor_description: Optional[str] = None
    is_bestseller: bool = False
    is_premium: bool = False

class Module(BaseModel):
    id: str = Field(..., alias="_id")
    course_id: str
    title: str
    order_index: int
    estimated_time: str

class Theory(BaseModel):
    id: str = Field(..., alias="_id")
    module_id: str
    markdown_content: str
    reading_time: int
    key_takeaways: List[str]

class Video(BaseModel):
    id: str = Field(..., alias="_id")
    module_id: str
    video_url: str
    duration: str
    is_dummy: bool = True

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answers: List[int] # Indices of correct options
    explanation: str

class Quiz(BaseModel):
    id: str = Field(..., alias="_id")
    module_id: str
    questions: List[QuizQuestion]
    pass_mark: int = 70

class Project(BaseModel):
    id: str = Field(..., alias="_id")
    module_id: str
    problem_statement: str
    requirements: List[str]
    rubric: dict

class UserProgress(BaseModel):
    user_id: str
    course_id: str
    module_id: str
    theory_completed: bool = False
    video_completed: bool = False
    quiz_score: float = 0.0
    quiz_answers: List[List[int]] = [] # Index i contains list of chosen option indices for question i
    project_status: str = "not_started" # not_started, submitted, approved
    project_submission_link: Optional[str] = None  # GitHub/drive link for project
    status: str = "locked" # locked, unlocked, completed

# Marketplace Models

class CartItem(BaseModel):
    user_id: str
    course_id: str
    course_title: str
    course_price: float
    added_at: datetime = Field(default_factory=datetime.utcnow)

class Enrollment(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    course_id: str
    course_title: str
    enrolled_at: datetime = Field(default_factory=datetime.utcnow)
    progress: float = 0.0  # 0-100
    last_accessed: Optional[datetime] = None
    last_accessed_module: Optional[str] = None

# Mock Interview Models

class InterviewerPersona(BaseModel):
    name: str
    role: str
    company_style: str
    tone: str # formal, neutral, friendly, intense
    depth: str # structured, conversational, deep-dive
    follow_up_style: str # aggressive, probing, gentle

class InterviewRound(BaseModel):
    round_type: str # technical, behavioral, hr_voice
    persona: InterviewerPersona
    status: str = "pending" # pending, active, completed
    score: Optional[float] = None
    feedback: Optional[str] = None
    assessment_metrics: Optional[dict] = None

class InterviewSession(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    company: str
    role: str
    experience_level: str # Fresher, Mid, Senior
    rounds: List[InterviewRound] = []
    current_round_index: int = 0
    status: str = "setup" # setup, in_progress, completed
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ========== System Deconstruction Lab Models ==========

class SDLProject(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    owner_id: str
    owner_name: str
    owner_avatar: Optional[str] = None
    title: str
    project_type: str  # system_replica, original_build, collaboration_request
    problem_statement: str
    architecture_focus: str
    skills_required: List[str] = []
    team_size: int = 1
    timeline: str  # e.g., "4 weeks"
    roles_needed: List[str] = []  # frontend, backend, devops, ai, ui_ux
    tags: List[str] = []  # AI, Backend, System Design, Full Stack, DevOps, Beginner Friendly
    github_link: Optional[str] = None
    overview: Optional[str] = None
    architecture_breakdown: Optional[str] = None
    feature_checklist: List[dict] = []  # [{name, completed}]
    progress: float = 0.0  # 0-100
    status: str = "open"  # open, in_progress, completed, archived
    featured: bool = False
    trending: bool = False
    views: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SDLProjectMember(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    project_id: str
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    role: str  # frontend, backend, devops, ai, ui_ux, lead
    status: str = "active"  # active, removed
    joined_at: datetime = Field(default_factory=datetime.utcnow)

class SDLTask(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    project_id: str
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None  # user_id
    assigned_name: Optional[str] = None
    status: str = "todo"  # todo, in_progress, review, done
    priority: str = "medium"  # low, medium, high, critical
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SDLComment(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    project_id: str
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SDLJoinRequest(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    project_id: str
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    role_requested: str
    message: Optional[str] = None
    status: str = "pending"  # pending, accepted, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ========== Institution Dashboard Models ==========

class Institution(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    email: str
    domain: str
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    
    # Unstop-style Enhancements
    social: Optional[dict] = {
        "linkedin": "",
        "twitter": "",
        "instagram": "",
        "website": ""
    }
    team: Optional[List[dict]] = [] # [{name, email, role}]
    notifications: Optional[dict] = {
        "admin_alerts": {
            "new_registrations": False,
            "new_submissions": False,
            "judge_acceptances": True,
            "judge_evaluations": True
        },
        "student_emails": {
            "welcome_on_reg": True,
            "submission_receipt": True,
            "result_announcements": True
        },
        "judge_comms": {
            "invitations": True,
            "evaluation_reminders": True
        }
    }
    email_custom_message: Optional[str] = ""
    
    cached_stats: dict = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Event(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    institution_id: str
    title: str
    description: str
    external_registration_link: Optional[str] = None

    # Classification
    category: str  # Hackathon, Coding Competition, Design Challenge
    event_type: str  # Online, Offline, Hybrid
    status: str = "DRAFT"

    # Timeline
    start_date: datetime
    end_date: datetime
    registration_deadline: datetime
    submission_deadline: Optional[datetime] = None

    # Participation
    participation_mode: str = "BOTH"  # INDIVIDUAL, TEAM, BOTH
    max_participants: Optional[int] = None
    min_team_size: Optional[int] = None
    max_team_size: Optional[int] = None

    # Prizes & Rules
    prize_pool: Optional[str] = None
    number_of_prizes: Optional[int] = None
    rules_guidelines: Optional[str] = None
    
    # Judging & Evaluation
    judges: List[dict] = [] # [{name, email, expertise, status: 'INVITED'|'ACCEPTED'}]
    judging_criteria: List[dict] = [] # [{name, max_points}]
    
    # Workflow Stages (Unstop-Style)
    stages: List[dict] = [] 
    # [{name, type, deadline, passing_criteria: {min_score, submission_required}}]

    # Registration Settings
    registration_settings: Optional[dict] = {}

    # Features
    has_submission: bool = True
    requires_github: bool = False
    requires_demo_video: bool = False
    requires_file_upload: bool = False
    has_judging: bool = True
    is_blind_judging: bool = False
    judging_criteria: List[dict] = []

    # Metadata
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class EventFAQ(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    event_id: str
    question: str
    answer: str
    category: str = "General"
    order: int = 0
    is_published: bool = True
    is_featured: bool = False
    priority_score: int = 0
    views: int = 0
    helpful_count: int = 0
    tags: List[str] = []
    auto_pin_enabled: bool = True
    created_by: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Participant(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    event_id: str
    institution_id: str
    college_name: Optional[str] = None
    year: Optional[str] = None
    department: Optional[str] = None
    skills: List[str] = []
    registration_status: str = "Registered"
    current_stage: Optional[str] = None
    last_stage_submitted: Optional[str] = None
    completed_stages: List[str] = []
    team_id: Optional[str] = None
    registered_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Team(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    event_id: str
    team_name: str
    team_leader_id: str
    members: List[dict] = []
    status: str = "Pending"
    formed_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Submission(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    opportunity_id: Optional[str] = None # Link to Opportunity
    event_id: str
    team_id: Optional[str] = None
    participant_id: Optional[str] = None
    user_id: Optional[str] = None # For individual submissions
    project_title: str
    project_description: str
    github_url: Optional[str] = None
    demo_video_url: Optional[str] = None
    demo_link: Optional[str] = None # Added for demoLink
    document_link: Optional[str] = None # Added for documentLink
    attachments: List[str] = []
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "Submitted" # Submitted, Evaluated
    average_score: float = 0.0
    total_score: float = 0.0 # Added total score
    plagiarism_score: float = 0.0
    plagiarism_report: str = ""
    additional_notes: Optional[str] = None # Added for student notes
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class HackathonSubmission(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    submissionId: Optional[str] = None # Will use _id
    hackathonId: str = ""
    eventId: Optional[str] = None
    institutionId: str
    teamName: str
    teamType: str # Solo, Team
    teamLead: str # Lead Name
    teamMembers: List[str] = []
    problemStatement: str
    solution: str
    pptLink: str
    githubLink: Optional[str] = None
    deployedLink: Optional[str] = None
    domain: str
    submittedBy: str # user_id
    assignedJudgeId: Optional[str] = None
    status: str = "Pending" # Pending, Assigned, Evaluated
    totalScore: float = 0.0
    rubricScores: Optional[dict] = {} # {Innovation: 8, ...}
    feedback: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class Rubric(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    opportunity_id: Optional[str] = None
    event_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    max_score: int = 10

class SubmissionScore(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    submission_id: str
    rubric_id: str
    evaluator_id: str
    score: float
    feedback: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Judge(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    expertise_areas: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Score(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    submission_id: str
    judge_id: str
    event_id: str
    criteria_scores: dict # {rubric_id: score}
    total_score: float
    feedback: Optional[str] = None # Consistent with user request
    comments: Optional[str] = None
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LeaderboardEntry(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    event_id: str
    participation_type: str = "TEAM" # TEAM or INDIVIDUAL
    team_id: Optional[str] = None
    participant_id: Optional[str] = None
    team_name: Optional[str] = None
    recipient_name: Optional[str] = None
    project_name: Optional[str] = None
    total_score: float
    rank: int
    points: int = 0
    final_status: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class EventResult(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    event_id: str
    winner_ids: List[str] = [] # IDs of winning teams/participants
    final_rankings: List[dict] = [] # Full snapshot of rankings
    prize_distribution: List[dict] = [] # Mapping of rank to prize amount
    announcement_timestamp: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Certificate(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    event_id: str
    user_id: str
    team_id: Optional[str] = None
    participant_name: str
    team_name: Optional[str] = None
    rank: Optional[int] = None
    issued_date: datetime = Field(default_factory=datetime.utcnow)
    verification_code: str
    verification_url: str
    status: str = "ISSUED"
    qr_code: Optional[str] = None
    immutable_flag: bool = True

class AuditLog(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    actor_id: str
    action: str
    resource_type: str
    resource_id: str
    details: dict = {}
    ip_address: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class DashboardStats(BaseModel):
    total_participants: int = 0
    active_events: int = 0 
    total_submissions: int = 0
    upcoming_deadlines: int = 0
    engagement_rate: float = 0.0

class Notification(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    event_id: Optional[str] = None
    message: str
    type: str = "update" # update, info, success, warning
    trigger_type: str = "manual"
    is_read: bool = False
    delivery_status: str = "sent"
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ========== Opportunity Models ==========

class Opportunity(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    title: str
    organization: str
    type: str  # Hackathon / Internship / Job / Competition
    description: str
    location: Optional[str] = None
    deadline: datetime
    applicantsCount: int = 0
    average_rating: float = 0.0
    total_reviews: int = 0
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    createdBy: str  # institutionId
    status: str = "active"  # active / closed

class OpportunityApplication(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    opportunity_id: str
    user_id: str
    name: str
    email: str
    resume_url: Optional[str] = None
    interest_reason: str
    status: str = "pending" # pending, accepted, rejected
    applied_at: datetime = Field(default_factory=datetime.utcnow)


# ========== Skill Assessment Models ==========

class QuestionResult(BaseModel):
    questionId:         int
    questionType:       str
    topic:              str
    score:              int
    verdict:            str
    answer:             str
    strengths:          List[str] = []
    gaps:               List[str] = []
    idealApproach:      Optional[str] = None
    interviewReadiness: Optional[int] = None


class MistakeAnalysis(BaseModel):
    questionId:            int
    questionNumber:        int
    topic:                 str
    questionType:          str
    score:                 int
    mistake:               str
    expectedApproach:      str
    improvementSuggestion: str


class SaveAssessmentRequest(BaseModel):
    userId:             str
    skillId:            str
    skillName:          str
    score:              int
    interviewReadiness: int
    level:              str
    strengths:          List[str]
    weaknesses:         List[str]
    weakAreas:          List[str] = []
    questionResults:    List[QuestionResult]
    mistakeAnalysis:    List[MistakeAnalysis] = []
    completedAt:        datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class AssessmentResponse(BaseModel):
    assessmentId:       str
    userId:             str
    skillId:            str
    skillName:          str
    icon:               Optional[str] = None
    score:              int
    interviewReadiness: int
    level:              str
    strengths:          List[str]
    weaknesses:         List[str]
    weakAreas:          List[str] = []
    questionResults:    List[QuestionResult]
    mistakeAnalysis:    List[MistakeAnalysis] = []
    completedAt:        datetime
    createdAt:          Optional[datetime] = None

class OpportunityReview(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    opportunity_id: str
    user_id: str
    user_name: str
    rating: int = Field(..., ge=1, le=5)
    review_text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Avatar(BaseModel):
    id: str = Field(..., alias="_id")
    label: str
    image_url: str
    category: Optional[str] = None
    crop_x: Optional[int] = None
    crop_y: Optional[int] = None
    crop_w: Optional[int] = None
    crop_h: Optional[int] = None
    is_active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ========== STUD OTT Models ==========

class EducationalVideo(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    title: str
    description: Optional[str] = None
    youtubeUrl: str
    videoId: str
    thumbnailUrl: Optional[str] = None
    category: str
    channelName: Optional[str] = None
    duration: Optional[str] = None
    views: int = 0
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class SavedVideo(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    studentId: str
    videoId: str
    savedDate: datetime = Field(default_factory=datetime.utcnow)

class WatchHistory(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    studentId: str
    videoId: str
    watchProgress: float = 0.0
    lastWatchedDate: datetime = Field(default_factory=datetime.utcnow)

class EducationalBlog(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    title: str
    snippet: str
    content: Optional[str] = None
    author: str
    imageUrl: str
    readTime: str
    link: Optional[str] = None
    category: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
