import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL } from '../apiConfig';
import { useAuth } from '../AuthContext';
import {
  ArrowLeft, CheckCircle2, PlayCircle, FileText, Award, Smartphone,
  Infinity as InfinityIcon, Zap, Target, Star, Users, Clock, Calendar,
  BookOpen, ChevronDown, Shield, Laptop, ChevronRight,
  Briefcase, GraduationCap, LayoutDashboard, BrainCircuit, Play, Globe, X
} from 'lucide-react';
import { getDetailedCurriculum } from '../utils/curriculumUtils';

interface Course {
  _id: string;
  title: string;
  description: string;
  role_tag: string;
  difficulty: string;
  skills?: string[];
  duration?: string;
  image?: string;
  standard?: string;
  price?: number;
  rating?: number;
  total_reviews?: number;
  total_hours?: number | string;
  level?: string;
  key_topics?: string[];
  last_updated?: string;
  instructor?: string;
  is_bestseller?: boolean;
  is_premium?: boolean;
  user_state?: 'NOT_PURCHASED' | 'IN_CART' | 'ENROLLED';
}

const MOCK_COURSES: Course[] = [
  {
    _id: 'm1',
    title: 'Generative AI',
    description: 'Your complete beginner-to-advanced roadmap to understand, build and apply AI in real-world scenarios using modern tools.',
    role_tag: 'AI Fundamentals',
    difficulty: 'Beginner',
    skills: ['AI Basics', 'Generative AI', 'Prompt Engineering', 'AI Tools', 'AI Projects'],
    duration: '8.5 hrs',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80',
    price: 799,
    rating: 4.8,
    total_reviews: 2310,
    total_hours: 8.5,
    instructor: 'Adarsh Singh',
    is_bestseller: true
  },
  {
    _id: 'm2',
    title: 'Prompt Engineering Mastery',
    description: 'Master Prompts. Get Better Outputs. Build Smarter.',
    role_tag: 'AI',
    difficulty: 'Beginner',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
    price: 599,
    rating: 4.7,
    total_reviews: 1800,
  },
  {
    _id: 'm3',
    title: 'AI Tools & Productivity Masterclass',
    description: 'Work Smarter with AI Tools & Automation.',
    role_tag: 'AI',
    difficulty: 'Intermediate',
    image: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&q=80',
    price: 699,
    rating: 4.8,
    total_reviews: 2110,
  },
  {
    _id: 'm4',
    title: 'Build AI Agents From Scratch',
    description: 'Create AI Agents Using LangChain & OpenAI.',
    role_tag: 'AI',
    difficulty: 'Advanced',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
    price: 799,
    rating: 4.6,
    total_reviews: 945,
  }
];

const MOCK_BLOGS = [
  {
    id: 1,
    title: 'The Ultimate Guide to Prompt Engineering',
    desc: 'Learn how to construct the perfect prompts to get the best outputs from modern LLMs.',
    category: 'AI',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=600',
    slug: 'prompt-engineering-guide'
  },
  {
    id: 2,
    title: 'Future of AI in the Workplace',
    desc: 'How artificial intelligence is reshaping careers, productivity, and modern businesses.',
    category: 'Career',
    readTime: '7 min read',
    image: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80&w=600',
    slug: 'future-of-ai'
  },
  {
    id: 3,
    title: '10 AI Tools to Boost Your Productivity',
    desc: 'Discover the top tools that can help automate your daily workflows and save you hours.',
    category: 'Productivity',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=600',
    slug: 'ai-tools-productivity'
  }
];

const CourseDetail: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [courseModules, setCourseModules] = useState<any[]>([]);
  const [userState, setUserState] = useState<'NOT_PURCHASED' | 'IN_CART' | 'ENROLLED'>('NOT_PURCHASED');
  const [loading, setLoading] = useState(true);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [expandedModules, setExpandedModules] = useState<number[]>([0]);
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(false);

  const userId = user?.uid || 'test-user';

  const extractCourseId = (slug: string | undefined) => {
    if (!slug) return '';
    // If slug contains '--', the part after the last '--' is the course ID used in our data
    const parts = slug.split('--');
    return parts.length > 1 ? parts[parts.length - 1] : slug;
  };

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        setLoading(true);
        const courseRes = await fetch(`${API_BASE_URL}/api/courses`);
        const coursesDataFromApi = await courseRes.json();
        const allCourses = [...MOCK_COURSES, ...(coursesDataFromApi || [])];
        const courseIdFromSlug = extractCourseId(courseId);
        const foundCourse = allCourses.find((c: Course) => c._id === courseIdFromSlug);

        if (!foundCourse) {
          navigate('/learn/courses', { replace: true });
          return;
        }

        setCourse(foundCourse);

        setCourseModules(GENERATIVE_AI_CURRICULUM);

        if (userId) {
          const stateRes = await fetch(`${API_BASE_URL}/api/user-courses/${userId}`);
          const stateData = await stateRes.json();
          if (stateData.enrolled?.some((c: Course) => c._id === foundCourse._id)) setUserState('ENROLLED');
          else if (stateData.in_cart?.some((c: Course) => c._id === foundCourse._id)) setUserState('IN_CART');
          else setUserState('NOT_PURCHASED');
        }
      } catch (err) {
        navigate('/learn/courses', { replace: true });
      } finally {
        setLoading(false);
      }
    };
    fetchCourseDetails();
  }, [courseId, userId]);

  const toggleModule = (idx: number) => {
    setExpandedModules(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleEnrollNow = () => navigate(`/learn/enroll/ai?courseId=${course?._id}`);
  const handleGoToCourse = () => navigate(`/learn/course-player/${course?._id}`);

  if (loading || !course) return (
    <div className="min-h-screen bg-white px-6 py-32 flex items-start justify-center">
      <div className="w-full max-w-5xl rounded-[2.5rem] border border-gray-100 bg-white shadow-sm p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-6 text-[#6C2BFF] font-black text-[10px] uppercase tracking-[0.3em]">
          <div className="w-4 h-4 rounded-full border-2 border-[#6C2BFF]/20 border-t-[#6C2BFF] animate-spin" />
          Loading course details
        </div>
        <div className="h-12 w-3/4 rounded-full bg-gray-100 animate-pulse mb-4" />
        <div className="h-5 w-full rounded-full bg-gray-100 animate-pulse mb-2" />
        <div className="h-5 w-5/6 rounded-full bg-gray-100 animate-pulse mb-2" />
        <div className="h-5 w-2/3 rounded-full bg-gray-100 animate-pulse" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-24 overflow-x-hidden selection:bg-[#6C2BFF]/20 selection:text-gray-900">

      {/* 1. HERO SECTION (DARK) */}
      <div className="relative pt-32 pb-20 px-6 overflow-hidden bg-[#05050A] text-white">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#6C2BFF]/20 rounded-full blur-[120px] pointer-events-none transform translate-x-1/3 -translate-y-1/3 z-0" />
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-[#EC4899]/10 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-0" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Back button */}
          <button onClick={() => navigate('/learn/courses')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Back to Courses</span>
          </button>

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
            {/* Left Info */}
            <div className="flex-1">
              <div className="inline-flex items-center justify-center bg-[#6C2BFF]/20 border border-[#6C2BFF]/30 px-4 py-1.5 rounded-lg mb-6">
                <span className="text-sm font-bold text-white">{course.role_tag}</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight mb-6">
                Generative <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] to-[#D946EF]">AI Course</span>
              </h1>

              <p className="text-lg text-gray-300 mb-8 max-w-2xl leading-relaxed">{course.description}</p>
              <img loading="lazy" src="/images/ai_foundations_1779792498429.png" alt={course.title} className="my-6 rounded-lg" />

              <div className="flex flex-wrap gap-3 mb-10">
                {(course.skills || []).map((skill, idx) => (
                  <span key={idx} className="bg-[#1A0B3B]/50 border border-[#6C2BFF]/20 text-gray-200 text-sm font-medium px-4 py-2 rounded-full">
                    {skill}
                  </span>
                ))}
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-6 mb-10 pb-10">
                <div className="flex items-center gap-2 pr-6 border-r border-white/10">
                  <span className="text-xl">⭐</span>
                  <span className="text-lg font-bold text-yellow-400">4.2</span>
                  <span className="text-xs text-gray-400 mt-1">(450 Reviews)</span>
                </div>

                <div className="flex items-center gap-2 pr-6 border-r border-white/10">
                  <span className="text-xl"></span>
                  <span className="text-lg font-bold text-white">1,500</span>
                  <span className="text-xs text-gray-400 mt-1">Students Enrolled</span>
                </div>

                <div className="pr-6 border-r border-white/10">
                  <div className="text-lg font-bold text-[#A88CFF] mb-0.5">{course.total_hours} 8 hrs</div>
                  <div className="text-xs text-gray-400">Total Duration</div>
                </div>

                <div>
                  <div className="text-lg font-bold text-[#D946EF] mb-0.5">{course.difficulty}</div>
                  <div className="text-xs text-gray-400">Level</div>
                </div>
              </div>

              {/* Feature Pills Box */}
              <div className="bg-[#1A0B3B]/40 backdrop-blur-md border border-[#6C2BFF]/20 rounded-2xl p-6 flex flex-wrap gap-8 justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#05050A] border border-[#6C2BFF]/30 flex items-center justify-center">
                    <Award className="w-5 h-5 text-[#A88CFF]" />
                  </div>
                  <span className="text-sm font-medium text-gray-300 leading-tight">Completion<br />Certificate</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#05050A] border border-[#6C2BFF]/30 flex items-center justify-center">
                    <Target className="w-5 h-5 text-[#A88CFF]" />
                  </div>
                  <span className="text-sm font-medium text-gray-300 leading-tight">Real World<br />Projects</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#05050A] border border-[#6C2BFF]/30 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-[#A88CFF]" />
                  </div>
                  <span className="text-sm font-medium text-gray-300 leading-tight">Internship<br />Opportunities</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#05050A] border border-[#6C2BFF]/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#A88CFF]" />
                  </div>
                  <span className="text-sm font-medium text-gray-300 leading-tight">Community<br />Access</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#05050A] border border-[#6C2BFF]/30 flex items-center justify-center">
                    <InfinityIcon className="w-5 h-5 text-[#A88CFF]" />
                  </div>
                  <span className="text-sm font-medium text-gray-300 leading-tight">Lifetime<br />Access</span>
                </div>
              </div>
            </div>

            {/* Right Card */}
            <div className="w-full lg:w-[420px] flex-shrink-0">
              <div className="bg-[#0D081E]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 sticky top-24 shadow-[0_20px_50px_rgba(108,43,255,0.15)]">
                <div className="relative h-56 rounded-2xl overflow-hidden mb-6 group cursor-pointer border border-white/10">
                  <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 text-white ml-1 fill-white" />
                    </div>
                  </div>
                </div>

                <div className="flex items-end gap-3 mb-6">
                  <div className="text-4xl font-black text-white">₹{course.price}</div>
                  <div className="text-lg text-gray-500 line-through mb-1">₹2,499</div>
                  <div className="text-sm font-bold text-green-400 mb-1.5">68% OFF</div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between text-sm text-gray-300"><span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-gray-400" /> 12 Modules</span></div>
                  <div className="flex items-center justify-between text-sm text-gray-300"><span className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> 85 Lessons</span></div>
                  <div className="flex items-center justify-between text-sm text-gray-300"><span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> 8.5 Hours</span></div>
                  <div className="flex items-center justify-between text-sm text-gray-300"><span className="flex items-center gap-2"><Target className="w-4 h-4 text-gray-400" /> Beginner Friendly</span></div>
                  <div className="flex items-center justify-between text-sm text-gray-300"><span className="flex items-center gap-2"><Globe className="w-4 h-4 text-gray-400" /> English</span></div>
                </div>

                <div className="space-y-3">
                  <button onClick={handleEnrollNow} className="w-full py-4 bg-gradient-to-r from-[#6C2BFF] to-[#A88CFF] text-white font-black text-sm uppercase tracking-widest rounded-xl hover:shadow-[0_0_30px_rgba(108,43,255,0.4)] transition-all">
                    Enroll Now
                  </button>
                  <button className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all">
                    Preview Course
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Shield className="w-4 h-4 text-green-500" /> 14-Day Money Back Guarantee
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. WHAT YOU'LL GET SECTION (LIGHT) */}
      <div className="py-20 px-6 border-t border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 tracking-tight">
              What You'll Get With <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C2BFF] to-[#A88CFF]">This Course</span>
            </h2>
            <p className="text-gray-600 text-lg">Everything you need to start, learn, and grow in AI — from basics to real-world applications.</p>
            <img src="/images/prompt_mastery_1779792771105.png" alt="Prompt Mastery" className="my-6 rounded-lg" />
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-[2rem] p-8 md:p-12 relative overflow-hidden">
            <div className={`grid md:grid-cols-2 gap-12 transition-all duration-500 ${isDetailsExpanded ? '' : 'h-[300px] overflow-hidden'}`}>

              <div className="space-y-12">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">Brief Description</h3>
                  <p className="text-gray-600 leading-relaxed">
                    This course is a complete learning path for anyone who wants to understand Artificial Intelligence and master Generative AI tools. You'll learn the core concepts, how modern AI models work, prompt engineering techniques, AI tools, automation, and how to build real-world AI projects.
                    <br /><br />
                    No prior AI knowledge is required. We start from the basics and take you all the way to building your own AI applications.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">Eligibility / Prerequisites</h3>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#6C2BFF] rounded-full" /> No prior AI or coding experience required</li>
                    <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#6C2BFF] rounded-full" /> Basic computer knowledge</li>
                    <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#6C2BFF] rounded-full" /> Curiosity to learn and build</li>
                    <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#6C2BFF] rounded-full" /> Consistent internet connection</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-12">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">What You'll Walk Away With</h3>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> Strong foundation in AI, Generative AI, and LLMs</li>
                    <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> Prompt engineering skills to get high-quality outputs</li>
                    <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> Hands-on experience with industry-leading tools</li>
                    <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> Build real AI projects for your portfolio</li>
                    <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> Certificate of completion and career-ready skills</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">Skills You'll Learn</h3>
                  <div className="grid grid-cols-2 gap-3 text-gray-600 text-sm font-medium">
                    {['AI & Machine Learning', 'Generative AI & LLMs', 'Prompt Engineering', 'AI Tools & Productivity', 'Image Generation', 'AI Integrations'].map(s => (
                      <div key={s} className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#EC4899] rounded-full" /> {s}</div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {!isDetailsExpanded && (
              <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            )}

            <div className="mt-8 flex justify-center relative z-10">
              <button
                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-gray-200 shadow-sm bg-white text-[#6C2BFF] font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                {isDetailsExpanded ? 'Show Less' : 'Show More'} <ChevronDown className={`w-4 h-4 transition-transform ${isDetailsExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. LEARNING JOURNEY (LIGHT) */}
      <div className="py-20 px-6 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 tracking-tight">
              Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C2BFF] to-[#A88CFF]">Learning Journey</span>
            </h2>
            <p className="text-gray-600 text-lg">A step-by-step roadmap from beginner to AI-ready.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-[#6C2BFF]/10 via-[#6C2BFF]/30 to-[#6C2BFF]/10 -translate-y-1/2 z-0 border-t border-dashed border-[#6C2BFF]/40" />

            {[
              { n: 1, t: 'Start Learning Foundations', d: 'Understand fundamentals and concepts.' },
              { n: 2, t: 'Learn Core Skills', d: 'Build strong fundamentals.' },
              { n: 3, t: 'Practice Through Mini Tasks', d: 'Hands-on implementation.' },
              { n: 4, t: 'Build Real Applications', d: 'Portfolio-ready projects.' },
              { n: 5, t: 'Gain Industry Exposure', d: 'Internships, community, collaboration.' },
              { n: 6, t: 'Become Career Ready', d: 'Resume, placement readiness, confidence.' }
            ].map((step, idx) => (
              <div key={idx} className="flex-1 relative z-10 flex flex-col items-center text-center group mt-8 md:mt-0">
                <div className="text-[6rem] font-black text-gray-100 absolute -top-14 select-none transition-colors">{step.n}</div>
                <div className="w-12 h-12 bg-white border-2 border-[#6C2BFF] rounded-full flex items-center justify-center text-xl font-black text-[#6C2BFF] mb-6 shadow-sm shadow-[#6C2BFF]/20 relative z-10">
                  {step.n}
                </div>
                <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 hover:border-[#6C2BFF]/40 transition-colors h-full w-full max-w-[200px] relative z-10">
                  <h4 className="font-bold text-gray-900 text-sm mb-2">{step.t}</h4>
                  <p className="text-xs text-gray-500">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>



      {/* 5 & 6. CURRICULUM & WHY THIS COURSE (LIGHT) */}
      <div className="py-20 px-6 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Course Curriculum</h2>
            <div className="flex items-center justify-between text-gray-500 font-medium text-sm mb-8">
              <span>14 Modules • 80 Lessons • Self-Paced</span>
              <button
                onClick={() => setIsCurriculumModalOpen(true)}
                className="text-[#6C2BFF] hover:text-[#5B21D6] font-bold transition-colors"
              >
                View Full Curriculum →
              </button>
            </div>

            <div className="space-y-3">
              {courseModules.slice(0, 5).map((mod, i) => (
                <div key={i} className="border border-gray-200 rounded-xl bg-gray-50 overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleModule(i)}
                    className="w-full flex items-center justify-between p-5 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#6C2BFF]/10 text-[#6C2BFF] flex items-center justify-center font-black text-sm shrink-0">{i + 1}</div>
                      <span className="font-bold text-gray-900 pr-4">{mod.title}</span>
                    </div>
                    <div className="flex items-center gap-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500 font-medium hidden sm:inline-block">
                        {Array.isArray(mod.lessons) ? mod.lessons.length : (mod.lessons || 0)} Lessons • {mod.duration || '45 mins'}
                      </span>
                      <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform shrink-0 ${expandedModules.includes(i) ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {expandedModules.includes(i) && (
                    <div className="p-5 pt-0 border-t border-gray-200 bg-white">
                      {mod.description && <p className="py-4 text-sm text-gray-600 leading-relaxed font-medium border-b border-gray-100 mb-4">{mod.description}</p>}
                      {mod.topics && mod.topics.length > 0 ? (
                        <ul className="space-y-3">
                          {mod.topics.map((topic: string, tIdx: number) => (
                            <li key={tIdx} className="flex items-start gap-3 text-sm text-gray-700">
                              <PlayCircle className="w-4 h-4 text-[#6C2BFF] mt-0.5 shrink-0" />
                              <span className="leading-relaxed">{topic}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="py-4 text-sm text-gray-600 leading-relaxed">This module contains detailed video walkthroughs, reading materials, and quizzes.</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {courseModules.length > 5 && (
              <div className="text-center mt-6">
                <button
                  onClick={() => setIsCurriculumModalOpen(true)}
                  className="px-6 py-3 bg-white border border-gray-200 text-gray-900 font-bold text-sm rounded-xl shadow-sm hover:border-[#6C2BFF]/40 transition-colors"
                >
                  View All {courseModules.length} Modules
                </button>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Why Take This Course?</h2>
            <div className="space-y-6">
              {[
                { i: BookOpen, t: 'Beginner Friendly', d: 'No prior AI knowledge needed.' },
                { i: LayoutDashboard, t: 'Practical & Hands-On', d: 'Learn by building real projects.' },
                { i: BrainCircuit, t: 'Industry-Relevant Skills', d: 'Skills companies are hiring for.' },
                { i: InfinityIcon, t: 'Lifetime Access', d: 'Learn at your own pace, forever.' },
                { i: Users, t: 'Community Support', d: 'Get help, share, and grow together.' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-[#6C2BFF]/10 flex items-center justify-center flex-shrink-0">
                    <item.i className="w-5 h-5 text-[#6C2BFF]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{item.t}</h4>
                    <p className="text-sm text-gray-500">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 7. WHERE THIS CAN TAKE YOU (LIGHT) */}
      <div className="py-20 px-6 border-t border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Where This Can Take You</h2>
            <p className="text-gray-600 text-lg">High growth career paths in AI</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { t: 'AI Engineer', s: '₹12L - ₹28L' },
              { t: 'Prompt Engineer', s: '₹10L - ₹24L' },
              { t: 'AI Product Manager', s: '₹18L - ₹40L' },
              { t: 'AI Automation', s: '₹8L - ₹18L' },
              { t: 'ML Ops Engineer', s: '₹12L - ₹26L' },
              { t: 'AI Research', s: '₹6L - ₹15L' }
            ].map((role, i) => (
              <div key={i} className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 text-center hover:border-[#6C2BFF]/40 transition-colors">
                <Briefcase className="w-6 h-6 text-[#6C2BFF] mx-auto mb-3" />
                <h4 className="font-bold text-gray-900 text-sm mb-2">{role.t}</h4>
                <div className="text-[#10B981] font-black text-lg">{role.s}</div>
                <div className="text-xs text-gray-500 mt-1">per year</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 8. CERTIFICATE (DARK) */}
      <div className="py-20 px-6 bg-[#05050A]">
        <div className="max-w-7xl mx-auto bg-gradient-to-r from-[#1A0B3B] to-[#0A0514] border border-white/10 rounded-[2rem] p-8 md:p-16 flex flex-col lg:flex-row items-center gap-12 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#6C2BFF]/20 rounded-full blur-[100px]" />
          <div className="flex-1 relative z-10">
            <div className="inline-flex items-center gap-2 text-[#A88CFF] font-bold text-sm tracking-widest uppercase mb-4">
              <Award className="w-5 h-5" /> Official Credential
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Certificate of Completion</h2>
            <p className="text-gray-300 mb-8 text-lg">Complete all modules, score 70% or more in the final quiz, and submit your final project to earn your STUDLYF Certificate.</p>
            <ul className="space-y-4 text-gray-300 font-medium">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-green-400" /> 70%+ in Final Quiz</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-green-400" /> Real Project Completion</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-green-400" /> Shareable on LinkedIn</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-green-400" /> Verified Certificate ID</li>
            </ul>
          </div>
          <div className="flex-1 relative z-10 w-full max-w-[600px]">
            {/* Fake certificate mockup */}
            <div className="bg-[#FAF9FF] text-center p-8 border-[8px] border-[#D1D5DB] rounded-lg shadow-2xl relative transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-[#111827]" />
              <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-[#111827]" />
              <img src="/images/studlyf.png" alt="STUDLYF" className="h-8 mx-auto mb-4 filter brightness-0" />
              <div className="text-[#6C2BFF] font-serif text-2xl mb-1 uppercase tracking-widest">Certificate</div>
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-8">Of Completion</div>
              <div className="text-[10px] text-gray-400 mb-1">This is to certify that</div>
              <div className="text-3xl font-serif text-gray-900 border-b border-gray-300 mx-12 pb-2 mb-4">Your Name</div>
              <div className="text-[10px] text-gray-400 mb-2">has successfully completed</div>
              <div className="font-bold text-gray-900 text-sm px-8 mb-8">{course.title}</div>
              <div className="flex justify-between items-end px-4">
                <div className="text-center"><div className="border-b border-gray-400 w-24 pb-1 mb-1 text-[10px] italic">Sai Eshwar</div><div className="text-[8px] text-gray-500 uppercase">CEO & Founder of STUDLYF</div></div>
                <div className="w-12 h-12 bg-gradient-to-br from-[#6C2BFF] to-[#EC4899] rounded-full flex items-center justify-center text-white text-[8px] font-bold shadow-lg">SEAL</div>
                <div className="text-center"><div className="border-b border-gray-400 w-24 pb-1 mb-1 text-[10px]">24 May 2026</div><div className="text-[8px] text-gray-500 uppercase">Date</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 8.25 RELATED BLOGS */}
      <div className="py-20 px-6 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-2">Related Blogs</h2>
            <p className="text-gray-500 font-medium text-lg max-w-2xl">Explore curated insights, guides, and resources to deepen your understanding beyond the course.</p>
          </div>

          <div className="flex flex-nowrap overflow-x-auto pb-8 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 custom-scrollbar">
            {MOCK_BLOGS.map((blog) => (
              <div
                key={blog.id}
                onClick={() => navigate('/blog')}
                className="min-w-[85vw] sm:min-w-[350px] md:min-w-0 snap-center md:snap-align-none bg-white border border-gray-200 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] rounded-[1.5rem] overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(108,43,255,0.15)] hover:border-[#6C2BFF]/30 hover:-translate-y-1.5 transition-all duration-300 group cursor-pointer flex flex-col shrink-0 md:shrink"
              >
                {/* Top Image */}
                <div className="h-48 overflow-hidden relative">
                  <img src={blog.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={blog.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Middle Content */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-[#6C2BFF]/10 text-[#6C2BFF] text-[11px] font-black uppercase tracking-widest rounded-full">{blog.category}</span>
                    <span className="text-[11px] font-bold text-gray-400">{blog.readTime}</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-lg mb-2 leading-snug group-hover:text-[#6C2BFF] transition-colors">{blog.title}</h4>
                  <p className="text-sm text-gray-500 mb-6 line-clamp-2 leading-relaxed">{blog.desc}</p>

                  {/* Bottom CTA */}
                  <div className="mt-auto flex items-center font-bold text-sm text-[#6C2BFF]">
                    Read Blog <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 8.5 RELATED COURSES (MOVED HERE) */}
      <div className="py-20 px-6 border-t border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Related Courses <span className="text-[#A88CFF]">You May Like</span></h2>
            </div>
            <button onClick={() => navigate('/learn/courses')} className="text-[#6C2BFF] font-bold text-sm flex items-center gap-1 hover:text-[#5B21D6] transition-colors">
              View All Courses <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOCK_COURSES.slice(1, 4).map(rc => (
              <div key={rc._id} className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden hover:border-[#6C2BFF]/50 transition-colors group cursor-pointer">
                <div className="h-40 overflow-hidden relative">
                  <img src={rc.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={rc.title} />
                </div>
                <div className="p-5">
                  <h4 className="font-bold text-gray-900 text-lg mb-2 line-clamp-1">{rc.title}</h4>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{rc.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 font-medium">
                    <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> {rc.rating}</span>
                    <span>{rc.total_reviews} reviews</span>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="font-black text-gray-900 text-xl">₹{rc.price}</span>
                    <button className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg text-xs font-bold hover:bg-[#6C2BFF] hover:text-white transition-colors">View Details</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 9. STICKY FOOTER (LIGHT) */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-50 hidden md:block">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center text-sm font-bold text-gray-700">
          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-[#6C2BFF]" /> 14-Day Guarantee</div>
          <div className="flex items-center gap-2"><InfinityIcon className="w-4 h-4 text-[#6C2BFF]" /> Lifetime Access</div>
          <div className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-[#6C2BFF]" /> Mobile & Desktop</div>
          <div className="flex items-center gap-2"><Users className="w-4 h-4 text-[#6C2BFF]" /> Community Support</div>
        </div>
      </div>

      {/* CURRICULUM MODAL */}
      <AnimatePresence>
        {isCurriculumModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#05050A]/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-gray-200"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 md:p-8 border-b border-gray-100">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-1">Full Course Curriculum</h3>
                  <p className="text-sm text-gray-500 font-medium">All {courseModules.length} Modules • Self-Paced</p>
                </div>
                <button
                  onClick={() => setIsCurriculumModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-gray-50">
                <div className="space-y-4 max-w-3xl mx-auto">
                  {courseModules.map((mod, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-6">
                        <div className="flex items-start md:items-center gap-4 mb-4 flex-col md:flex-row">
                          <div className="w-10 h-10 rounded-full bg-[#6C2BFF]/10 text-[#6C2BFF] flex items-center justify-center font-black text-base shrink-0">{i + 1}</div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 text-lg leading-tight mb-1">{mod.title}</h4>
                            <div className="text-xs font-medium text-gray-500">
                              {Array.isArray(mod.lessons) ? mod.lessons.length : (mod.lessons || 0)} Lessons • {mod.duration || '45 mins'}
                            </div>
                          </div>
                        </div>

                        {mod.description && (
                          <p className="text-sm text-gray-600 leading-relaxed mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                            {mod.description}
                          </p>
                        )}

                        {mod.topics && mod.topics.length > 0 && (
                          <ul className="space-y-3 pl-2">
                            {mod.topics.map((topic: string, tIdx: number) => (
                              <li key={tIdx} className="flex items-start gap-3 text-sm text-gray-700">
                                <PlayCircle className="w-4 h-4 text-[#6C2BFF] mt-0.5 shrink-0" />
                                <span className="leading-relaxed">{topic}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 bg-white flex justify-end">
                <button
                  onClick={() => setIsCurriculumModalOpen(false)}
                  className="px-6 py-2.5 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-black transition-colors"
                >
                  Close Curriculum
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CourseDetail;
