import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../apiConfig';
import WebImage from '../components/WebImage';
import { useAuth } from '../AuthContext';
import {
  Search, Star, Clock, User, ChevronRight,
  Monitor, BrainCircuit, Rocket, Layout, Database, TrendingUp, Plus,
  FileText, BookOpen, Target, Play, CheckCircle, Briefcase
} from 'lucide-react';

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
  category?: string;
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
  provider?: string;
  organization?: string;
}

const CategoryIcon = ({ category, className }: { category: string, className?: string }) => {
  const normalized = category.toLowerCase();
  if (normalized.includes('ai') || normalized.includes('intelligence') || normalized.includes('machine')) return <BrainCircuit className={className} />;
  if (normalized.includes('front') || normalized.includes('ui') || normalized.includes('design')) return <Layout className={className} />;
  if (normalized.includes('back') || normalized.includes('data')) return <Database className={className} />;
  if (normalized.includes('product') || normalized.includes('startup')) return <Rocket className={className} />;
  if (normalized.includes('career') || normalized.includes('soft')) return <TrendingUp className={className} />;
  return <Monitor className={className} />;
};

const getCategoryDesc = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized.includes('ai')) return 'Recommended for builders';
  if (normalized.includes('full') || normalized.includes('web') || normalized.includes('back') || normalized.includes('front')) return 'Web / App Careers';
  if (normalized.includes('product')) return 'Build products that scale';
  if (normalized.includes('ui') || normalized.includes('design')) return 'Design beautiful experiences';
  if (normalized.includes('data')) return 'Turn data into insights';
  if (normalized.includes('career')) return 'Communication, Resume, Placement';
  return 'Explore courses in this track';
}

const DarkCourseCard = ({
  _id,
  title,
  description,
  role_tag,
  difficulty,
  skills,
  duration,
  image,
  standard,
  rating = 4.2,
  total_reviews = 1200,
  total_hours = 12,
  price = 0,
  is_bestseller = false,
  is_premium = false,
  user_state = 'NOT_PURCHASED',
  onCardClick,
}: Course & { onCardClick: (course: Course) => void }) => {
  const displayImage = image || "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";

  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="bg-[#1A1135] border border-white/5 rounded-2xl overflow-hidden hover:shadow-[0_0_30px_rgba(108,43,255,0.2)] transition-all flex flex-col cursor-pointer group h-full"
      onClick={() => onCardClick({ _id, title, description, role_tag, difficulty, skills, duration, image, standard, rating, price, is_bestseller, is_premium, user_state } as Course)}
    >
      <div className="h-40 relative overflow-hidden flex-shrink-0">
        <WebImage src={displayImage} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1135] via-transparent to-transparent opacity-90" />

        <div className="absolute top-3 left-3">
          <span className="bg-gradient-to-r from-[#6C2BFF] to-[#8B5CF6] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
            {is_bestseller ? 'Popular' : is_premium ? 'Premium' : 'Trending'}
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <span className="text-[#A78BFA] text-[10px] font-black uppercase tracking-widest mb-2">{role_tag || 'DEVELOPMENT'}</span>
        <h3 className="text-white font-bold text-lg leading-tight mb-3 line-clamp-2">{title}</h3>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-4 mt-auto">
          {rating && (
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="w-3 h-3 fill-current" />
              <span className="font-bold text-white">{rating.toFixed(1)}</span>
              <span className="text-gray-500">({total_reviews >= 1000 ? (total_reviews / 1000).toFixed(1) + 'k' : total_reviews})</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{total_hours || 10} Hours</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{difficulty || 'Beginner'}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5">
          <button className="w-full py-2.5 rounded-lg bg-[#2D1B69] text-white text-sm font-bold group-hover:bg-[#6C2BFF] transition-colors shadow-lg">
            {user_state === 'ENROLLED' ? 'Continue Learning' : 'Start Learning'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const carouselCards = [
  { id: 1, title: 'AI & Machine Learning', subtext: 'Build intelligent systems', gradient: 'from-[#6C2BFF] to-[#8B5CF6]', icon: BrainCircuit, route: '/roadmaps/ai-ml-engineer' },
  { id: 2, title: 'Full Stack Development', subtext: 'Build modern web apps', gradient: 'from-[#4338CA] to-[#6C2BFF]', icon: Layout, route: '/roadmaps/frontend-developer' },
  { id: 3, title: 'Product & Startups', subtext: 'Build products that scale', gradient: 'from-[#EC4899] to-[#8B5CF6]', icon: Rocket, route: '/roadmaps/product-manager' },
  { id: 4, title: 'UI / UX Design', subtext: 'Design experiences people love', gradient: 'from-[#C084FC] to-[#EC4899]', icon: Monitor, route: '/roadmaps/ui-ux-designer' },
  { id: 5, title: 'Data Science & Analytics', subtext: 'Turn data into insights', gradient: 'from-[#3730A3] to-[#8B5CF6]', icon: Database, route: '/roadmaps/data-scientist' },
  { id: 6, title: 'Career Growth & Soft Skills', subtext: 'Prepare for placements', gradient: 'from-[#6C2BFF] to-[#EC4899]', icon: TrendingUp },
  { id: 7, title: 'Cybersecurity', subtext: 'Secure digital systems', gradient: 'from-[#312E81] to-[#8B5CF6]', icon: Briefcase },
  { id: 8, title: 'Backend Development', subtext: 'Build scalable servers', gradient: 'from-[#4F46E5] to-[#8B5CF6]', icon: Database, route: '/roadmaps/backend-developer' },
  { id: 9, title: 'Interview & Placement Prep', subtext: 'Crack opportunities confidently', gradient: 'from-[#C084FC] to-[#6C2BFF]', icon: CheckCircle },
];

const PremiumExploreCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-white pb-8 overflow-hidden">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-black text-[#1A1A1A] mb-4 tracking-tight">Explore Career Paths Like</h2>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto px-4">
          Discover curated learning journeys designed for modern careers, real-world skills, internships, and future opportunities.
        </p>
      </div>

      <div className="relative w-full">
        <div className="overflow-hidden py-4 -mx-2 px-2">
          <motion.div
            className="flex"
            animate={{ x: `-${currentIndex * 100}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          >
            {[0, 1, 2].map((slideIndex) => (
              <div key={slideIndex} className="w-full flex-shrink-0 px-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {carouselCards.slice(slideIndex * 3, slideIndex * 3 + 3).map((card) => (
                  <div
                    key={card.id}
                    onClick={() => {
                      if (card.route) {
                        navigate(card.route);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className={`relative overflow-hidden rounded-[2rem] p-8 aspect-[4/3] flex flex-col justify-between group cursor-pointer bg-gradient-to-br ${card.gradient} shadow-md hover:shadow-2xl hover:shadow-[#6C2BFF]/30 transition-all duration-300 hover:-translate-y-2`}
                  >
                    <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md z-10 shadow-sm border border-white/20">
                      <card.icon className="w-6 h-6 text-white" />
                    </div>

                    <div className="z-10 mt-auto">
                      <h3 className="text-2xl font-black text-white mb-2 leading-tight tracking-tight">{card.title}</h3>
                      <p className="text-white/90 font-medium text-base">{card.subtext}</p>
                    </div>

                    {/* Abstract Right Visuals */}
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-48 h-[120%] opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 pointer-events-none">
                      {card.id === 1 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-40 h-40 rounded-full border-[1px] border-white/30" />
                          <div className="absolute w-32 h-32 rounded-full border-[2px] border-white/50 rotate-45" />
                          <div className="absolute w-20 h-20 bg-white/20 blur-xl rounded-full" />
                        </div>
                      )}
                      {card.id === 2 && (
                        <div className="absolute inset-0 flex items-center justify-center rotate-12">
                          <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 transform -rotate-12 translate-x-4 -translate-y-4 shadow-2xl" />
                          <div className="absolute w-24 h-24 bg-white/20 backdrop-blur-md rounded-xl border border-white/30 transform rotate-6 -translate-x-4 translate-y-4 shadow-xl" />
                        </div>
                      )}
                      {card.id === 3 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg viewBox="0 0 100 100" className="w-48 h-48 fill-white/20 drop-shadow-2xl">
                            <path d="M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 Z" />
                          </svg>
                        </div>
                      )}
                      {card.id === 4 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-xl border border-white/40 shadow-[0_0_40px_rgba(255,255,255,0.3)] translate-x-4" />
                          <div className="absolute w-24 h-40 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 -translate-x-8" />
                        </div>
                      )}
                      {card.id === 5 && (
                        <div className="absolute inset-0 flex items-center justify-center rotate-45">
                          <div className="w-40 h-12 rounded-full border-2 border-white/40" />
                          <div className="absolute w-40 h-12 rounded-full border-2 border-white/20 rotate-45" />
                          <div className="absolute w-40 h-12 rounded-full border border-white/10 -rotate-45" />
                        </div>
                      )}
                      {card.id === 6 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg viewBox="0 0 100 100" className="w-40 h-40 stroke-white/40 stroke-[2] fill-transparent drop-shadow-2xl">
                            <path d="M10 90 L50 30 L90 10" />
                            <circle cx="90" cy="10" r="4" className="fill-white/80" />
                          </svg>
                        </div>
                      )}
                      {card.id === 7 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg viewBox="0 0 100 100" className="w-36 h-36 fill-white/20 stroke-white/40 stroke-2 drop-shadow-2xl">
                            <path d="M50 10 L90 25 L90 60 Q90 85 50 95 Q10 85 10 60 L10 25 Z" />
                          </svg>
                        </div>
                      )}
                      {card.id === 8 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-32 h-20 bg-white/20 backdrop-blur-md rounded-full border border-white/30 translate-y-4" />
                          <div className="absolute w-20 h-20 bg-white/30 backdrop-blur-lg rounded-full border border-white/40 -translate-y-2 -translate-x-4" />
                          <div className="absolute w-16 h-16 bg-white/20 backdrop-blur-md rounded-full border border-white/20 -translate-y-4 translate-x-6" />
                        </div>
                      )}
                      {card.id === 9 && (
                        <div className="absolute inset-0 flex items-center justify-center rotate-12">
                          <svg viewBox="0 0 100 100" className="w-40 h-40 fill-white/20 drop-shadow-2xl">
                            <polygon points="50,10 61,35 88,35 66,51 74,77 50,60 26,77 34,51 12,35 39,35" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </motion.div>
        </div>

        <div className="flex justify-center items-center gap-3 mt-10">
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`transition-all duration-300 rounded-full ${currentIndex === idx
                ? 'w-4 h-4 bg-[#6C2BFF]'
                : 'w-2.5 h-2.5 bg-gray-200 hover:bg-gray-300'
                }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const CoursesOverview: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [userStates, setUserStates] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const userId = user?.uid || 'test-user';

  const createSlug = (title: string, id: string) => {
    if (!title || !id) return '';
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${slug}--${id}`;
  };

  const handleCourseClick = (course: Course) => {
    const slug = createSlug(course.title, course._id);
    if (slug) navigate(`/learn/courses/${slug}`);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const coursesRes = await fetch(`${API_BASE_URL}/api/courses`);

        if (!coursesRes.ok) {
          setCourses([]);
          return;
        }

        const data = await coursesRes.json();
        if (data && Array.isArray(data) && data.length > 0) {
          // AWS Filter logic preserved
          const awsRegex = /\baws\b/;
          const filteredCourses = data.filter((c: any) => {
            const title = (c.title || '').toLowerCase();
            const role = (c.role_tag || '').toLowerCase();
            const provider = (c.provider || c.organization || '').toLowerCase();
            return !(awsRegex.test(title) || awsRegex.test(role) || awsRegex.test(provider));
          });
          setCourses(filteredCourses);
        } else {
          setCourses([]);
        }
      } catch (err) {
        setCourses([]);
      } finally {
        setLoading(false);
      }

      if (userId) {
        try {
          const stateRes = await fetch(`${API_BASE_URL}/api/user-courses/${userId}`);
          if (!stateRes.ok) return;
          const stateData = await stateRes.json();

          const states: { [key: string]: string } = {};
          stateData.enrolled?.forEach((c: Course) => { states[c._id] = 'ENROLLED'; });
          stateData.in_cart?.forEach((c: Course) => { states[c._id] = 'IN_CART'; });
          stateData.available?.forEach((c: Course) => { states[c._id] = 'NOT_PURCHASED'; });

          setUserStates(states);
        } catch (err) { }
      }
    };

    fetchData();
  }, [userId]);

  const dynamicCategories = useMemo(() => {
    const predefined = ['All', 'Backend', 'Frontend', 'Software Engineering', 'Data', 'AI', 'Cyber'];
    const cats = new Set(predefined);
    if (courses && courses.length > 0) {
      courses.forEach(c => {
        if (c.role_tag) cats.add(c.role_tag);
      });
    }
    return Array.from(cats);
  }, [courses]);

  const filteredCourses = useMemo(() => {
    let filtered = courses;
    if (activeCategory !== 'All') {
      filtered = filtered.filter(c => c.role_tag === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.role_tag || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [activeCategory, courses, searchQuery]);

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FC] px-6 py-32">
      <div className="max-w-7xl mx-auto rounded-[2.5rem] bg-white border border-gray-100 shadow-sm p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-6 text-[#6C2BFF] font-black text-[10px] uppercase tracking-[0.3em]">
          <div className="w-4 h-4 rounded-full border-2 border-[#6C2BFF]/20 border-t-[#6C2BFF] animate-spin" />
          Loading courses overview
        </div>
        <div className="h-14 w-4/5 rounded-full bg-gray-100 animate-pulse mb-4" />
        <div className="h-5 w-full rounded-full bg-gray-100 animate-pulse mb-2" />
        <div className="h-5 w-5/6 rounded-full bg-gray-100 animate-pulse mb-2" />
        <div className="h-5 w-2/3 rounded-full bg-gray-100 animate-pulse" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans text-[#1A1A1A]">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-[#F4F2FE] via-[#FAF9FF] to-white pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Soft background glow orbs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-[#6C2BFF]/10 to-transparent rounded-full blur-[100px] pointer-events-none transform translate-x-1/3 -translate-y-1/3 z-0" />
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#EC4899]/5 to-transparent rounded-full blur-[80px] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-0" />

        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-8">

          {/* Left Side: Content */}
          <div className="flex-1 flex flex-col items-start text-left">
            <h1 className="text-5xl md:text-6xl lg:text-[5rem] font-black leading-[1.05] tracking-tight text-[#1A1A1A] mb-6">
              MASTER REAL SKILLS,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C2BFF] to-[#EC4899]">NOT JUST COURSES</span>
            </h1>

            <p className="text-[#6C2BFF] font-black text-lg md:text-xl mb-6 tracking-wider uppercase">
              AI • Development • Product • Career Systems
            </p>

            <p className="text-gray-600 text-base md:text-lg mb-10 max-w-xl font-medium leading-relaxed">
              Learn from curated, industry-grade modules built for real-world outcomes, internships, projects, and hiring readiness.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 mb-12 relative z-20 w-full sm:w-auto">
              <button
                onClick={() => {
                  document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group relative flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-8 py-4 rounded-xl font-bold text-base shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all duration-300 ease-out active:scale-[0.98]"
              >
                Explore Courses <ChevronRight className="w-5 h-5 transition-transform duration-300 ease-out group-hover:translate-x-1" />
              </button>

              <Link
                to="/learn/career-fit"
                className="relative flex items-center justify-center bg-white border border-gray-200 text-[#1A1A1A] px-8 py-4 rounded-xl font-bold text-base shadow-[0_4px_14px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-gray-300 transition-all duration-300 ease-out active:scale-[0.98]"
              >
                Take Career Assessment
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-6 md:gap-10 text-sm w-full">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-[#6C2BFF]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-black text-[#1A1A1A] leading-none mb-1">4K+</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Students</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-[#6C2BFF]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-black text-[#1A1A1A] leading-none mb-1">10+</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Elite Modules</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-xl flex items-center justify-center text-[#6C2BFF]">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-black text-[#1A1A1A] leading-none mb-1">Hiring</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Focused Tracks</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Image Card */}
          <div className="flex-1 w-full max-w-lg lg:max-w-none relative mt-10 lg:mt-0">
            <div className="relative rounded-[2rem] shadow-[0_20px_50px_rgba(108,43,255,0.15)] border border-white/50 bg-white p-2">
              <div className="relative rounded-[1.5rem] overflow-hidden">
                <img
                  src="/images/course-overview-hero.png"
                  alt="Collaborative learning"
                  className="w-full h-auto aspect-[4/3] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#6C2BFF]/20 to-transparent mix-blend-overlay"></div>
              </div>

              {/* Floating Stat Cards */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-4 z-20"
              >
                <div className="bg-[#F4EEFF] p-3 rounded-xl text-[#6C2BFF]">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Average Hike</p>
                  <p className="text-xl font-black text-[#1A1A1A]">120%</p>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 15, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                className="absolute top-10 -right-8 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-4 z-20"
              >
                <div className="bg-green-50 p-3 rounded-xl text-green-600">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Got Placed</p>
                  <p className="text-xl font-black text-[#1A1A1A]">500+</p>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 2 }}
                className="absolute -top-6 left-10 bg-white p-3 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 z-20"
              >
                <div className="bg-yellow-50 p-2 rounded-xl text-yellow-500">
                  <Star className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Rating</p>
                  <p className="text-lg font-black text-[#1A1A1A]">4.2/5</p>
                </div>
              </motion.div>
            </div>
          </div>

        </div>
      </div>

      {/* Scrolling Logo Marquee */}
      <div className="relative w-full z-30 bg-[#0A0514] shadow-xl flex flex-col -mt-8 md:-mt-16">
        <div className="h-[80px] relative overflow-hidden flex items-center">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
            className="flex whitespace-nowrap gap-24 items-center w-fit px-12"
          >
            {[...Array(20)].map((_, i) => (
              <img
                key={i}
                src="/images/studlyf1.jpg"
                alt="STUDLYF"
                className="h-8 md:h-10 w-auto object-contain px-2"
              />
            ))}
          </motion.div>
        </div>
        {/* Blue/purple accent line at bottom */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#2563EB] via-[#6C2BFF] to-[#8B5CF6]" />
      </div>

      {/* Recommended Courses Section (Dark Theme) */}
      <div id="courses-section" className="bg-[#0F0824] py-24 px-6 relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#6C2BFF]/10 px-4 py-2 rounded-full border border-[#6C2BFF]/20 mb-4">
                <Star className="w-4 h-4 text-[#A78BFA]" />
                <span className="text-xs font-bold text-[#A78BFA] uppercase tracking-wider">Curated Learning Tracks</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">Explore Courses</h2>
              <p className="text-gray-400 mt-3 text-base md:text-lg max-w-2xl">
                Industry-ready programs designed for practical outcomes.
              </p>
            </div>

            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="relative flex-grow lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-[#6C2BFF] transition-colors shadow-inner"
                />
              </div>
            </div>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 shadow-xl">
              <Monitor className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <div className="text-xl font-bold text-white mb-2">No Courses Found</div>
              <p className="text-gray-400 text-sm">Try adjusting your filters or search query.</p>
              <button onClick={() => { setSearchQuery(''); }} className="mt-6 text-[#A78BFA] hover:text-white font-bold underline transition-colors">
                Clear Filters
              </button>
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <AnimatePresence>
                {(searchQuery ? filteredCourses : filteredCourses.slice(0, 8)).map((course) => (
                  <motion.div key={course._id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full">
                    <DarkCourseCard
                      {...course}
                      user_state={(userStates[course._id] || 'NOT_PURCHASED') as any}
                      onCardClick={handleCourseClick}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Trust Section - Logos */}
      <div className="bg-[#F8F9FC] py-16 px-6 border-y border-gray-100">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm font-bold text-gray-500 mb-10 tracking-wide">
            Trusted by professionals from leading companies and ambitious learners worldwide
          </p>

          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 lg:gap-20">
            {[
              { name: 'Google', url: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg', h: 'h-6 md:h-7' },
              { name: 'Microsoft', url: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg', h: 'h-5 md:h-6' },
              { name: 'Amazon', url: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', h: 'h-6 md:h-7' },
              { name: 'Meta', url: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg', h: 'h-4 md:h-5' },
              { name: 'Netflix', url: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', h: 'h-5 md:h-6' },
              { name: 'Stripe', url: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg', h: 'h-6 md:h-7' },
              { name: 'Airbnb', url: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg', h: 'h-6 md:h-7' }
            ].map(company => (
              <img
                key={company.name}
                src={company.url}
                alt={company.name}
                className={`${company.h} w-auto object-contain filter brightness-0 opacity-40 hover:opacity-60 transition-opacity duration-300`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Quote Section */}
      <div className="bg-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#0F0824] rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#6C2BFF]/20 rounded-full blur-3xl" />
            <img
              src="/images/OIP.webp"
              alt="Satya Nadella"
              className="w-48 h-48 md:w-64 md:h-64 object-cover rounded-2xl z-10 shadow-lg border border-white/5 bg-[#1A1135]"
            />
            <div className="z-10 relative">
              <div className="text-[#6C2BFF] text-6xl font-serif absolute -top-8 -left-4 opacity-30">"</div>
              <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight mb-6 relative z-10">
                The world is changing faster than ever. The best way to prepare for the future is to keep learning, unlearn and relearn. Build skills, build confidence, and most importantly, build the future.
              </h3>
              <div>
                <div className="text-white font-bold text-lg">Satya Nadella</div>
                <div className="text-gray-400 text-sm">CEO, Microsoft</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Student Outcomes Section */}
      <div className="bg-gradient-to-b from-[#F8F9FC] to-[#F4F2FE] py-32 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-20">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tighter leading-[1.05] flex flex-col items-center justify-center gap-2">
              <span className="text-[#1A1A1A]">How Our Courses</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C2BFF] via-[#A88CFF] to-[#EC4899] drop-shadow-sm pb-2">
                Build Your Future
              </span>
            </h2>
            <p className="text-gray-600 text-xl font-medium leading-relaxed max-w-2xl mx-auto">
              You are not just learning skills. Our courses are designed to help you build experience, create proof of work, and unlock real opportunities.
            </p>
          </div>

          <div className="flex flex-col gap-10">
            {[
              {
                heading: "Course Projects That Prove You",
                text: "Build real-world projects during your courses, create tangible proof of work, and showcase experiences that strengthen your profile.",
                image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
                reverse: false
              },
              {
                heading: "Mentorship Built Into Learning",
                text: "Learn through course-integrated mentorship, hands-on collaboration, and practical exposure designed for ambitious students.",
                image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
                reverse: true
              },
              {
                heading: "Career-Ready Course Outcomes",
                text: "Leverage your course achievements to access exclusive opportunities, communities, and experiences that help you grow beyond the curriculum.",
                image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&q=80",
                reverse: false
              }
            ].map((card, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className={`bg-white rounded-[32px] p-6 lg:p-8 flex flex-col ${card.reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 lg:gap-12 shadow-[0_8px_30px_rgba(108,43,255,0.04)] border border-purple-50 hover:shadow-[0_24px_50px_rgba(108,43,255,0.08)] hover:-translate-y-1 transition-all duration-500 group`}
              >
                {/* Image Side (40%) */}
                <div className="w-full md:w-[40%] h-64 md:h-[300px] lg:h-[340px] rounded-3xl overflow-hidden relative flex-shrink-0">
                  <img
                    src={card.image}
                    alt={card.heading}
                    className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-3xl pointer-events-none"></div>
                </div>

                {/* Text Side (60%) */}
                <div className={`w-full md:w-[60%] flex flex-col justify-center ${card.reverse ? 'md:pl-4 lg:pl-10' : 'md:pr-4 lg:pr-10'}`}>
                  <h3 className="text-3xl lg:text-4xl font-black text-[#1A1A1A] mb-4 lg:mb-6 tracking-tight leading-tight group-hover:text-[#6C2BFF] transition-colors duration-300">
                    {card.heading}
                  </h3>
                  <p className="text-gray-500 text-lg lg:text-xl leading-relaxed font-medium">
                    {card.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Career Tracks & FAQ Section */}
      <div className="bg-white py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">

          <PremiumExploreCarousel />

          <div className="bg-[#F8F9FC] border border-gray-200 rounded-3xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-10 md:gap-16">
              <div className="md:w-1/3">
                <h2 className="text-2xl font-black uppercase text-[#1A1A1A] mb-4">Frequently Asked Questions</h2>
                <p className="text-gray-500 text-sm">Everything you need to know about our structured tracks and platform.</p>
              </div>
              <div className="md:w-2/3 space-y-4">
                {[
                  { q: 'Are these courses beginner friendly?', a: 'Yes! Our courses are designed to take you from absolute beginner to industry-ready. We start with fundamentals and gradually build up to complex, real-world projects.' },
                  { q: 'Will I get a certificate after completion?', a: 'Absolutely. Every course comes with a verified, shareable certificate that you can add directly to your LinkedIn profile and resume.' },
                  { q: 'Are projects included in the courses?', a: 'Yes, hands-on learning is at the core of our platform. Every module includes practical assignments, and each track ends with a capstone project for your portfolio.' },
                  { q: 'Does this help with internships?', a: 'Yes! Our hiring-focused tracks are specifically built to align with what companies look for in interns and freshers. We also provide resume templates and interview prep.' },
                  { q: 'Is mentorship or doubt support available?', a: 'Yes, premium learners get access to our private community where you can ask questions, get code reviews, and receive guidance from industry mentors.' },
                  { q: 'Can I access the courses on mobile?', a: 'Definitely. The platform is fully responsive so you can learn on the go, whether you are on a phone, tablet, or desktop.' }
                ].map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div key={faq.q} className="border-b border-gray-200 pb-4">
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full flex justify-between items-center text-left text-sm font-bold text-gray-700 hover:text-[#6C2BFF] transition-colors py-3 group"
                      >
                        {faq.q}
                        <motion.div
                          initial={false}
                          animate={
                            isOpen
                              ? { scale: [1, 1.4, 1], rotate: [0, 90, 135], backgroundColor: "#6C2BFF", borderColor: "#6C2BFF" }
                              : { scale: [1, 1.4, 1], rotate: [135, 45, 0], backgroundColor: "transparent", borderColor: "#D1D5DB" }
                          }
                          transition={{ duration: 0.6, ease: "easeInOut", times: [0, 0.5, 1] }}
                          className="w-7 h-7 flex-shrink-0 ml-4 rounded-full border-2 flex items-center justify-center shadow-sm"
                        >
                          <Plus className={`w-3.5 h-3.5 transition-colors duration-300 ${isOpen ? 'text-white' : 'text-gray-500 group-hover:text-[#6C2BFF]'}`} />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <p className="text-gray-500 text-sm mt-3 leading-relaxed pr-10">
                              {faq.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Resources & Stories Section */}
      <div className="bg-white py-16 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">

          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-2">Free Resources</h3>
            <h2 className="text-2xl font-black uppercase text-[#1A1A1A] mb-8">Learn Before You Commit</h2>

            <div className="grid grid-cols-2 gap-4">
              {[
                { title: 'Free Mini Courses', desc: 'Short courses to get started', icon: Play, link: '/learn/courses-overview' },
                { title: 'Cheat Sheets', desc: 'Essential quick reference guides', icon: FileText, link: '/learn/company-modules' },
                { title: 'Practice Challenges', desc: 'Sharpen your skills daily', icon: Target, link: '/job-prep/mock-interview' },
                { title: 'Templates', desc: 'Resume, Project & More', icon: Layout, link: '/job-prep/resume-builder' },
              ].map(res => (
                <Link
                  key={res.title}
                  to={res.link}
                  className="flex gap-4 items-start p-4 rounded-2xl hover:bg-[#F8F9FC] transition-colors cursor-pointer border border-transparent hover:border-gray-100"
                >
                  <div className="bg-[#F4EEFF] p-3 rounded-xl text-[#6C2BFF]">
                    <res.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A1A] text-sm">{res.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{res.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-2">Community</h3>
                <h2 className="text-2xl font-black uppercase text-[#1A1A1A]">Learners Are Building Real Careers</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { name: 'Sneha Reddy', role: 'AI Engineer', text: 'Got my first AI internship at a top product company after completing the AI Engineer Path.', img: 'https://i.pravatar.cc/150?img=32' },
                { name: 'Rohan Das', role: 'Data Analyst', text: 'The projects and real-world case studies helped me crack my dream job.', img: 'https://i.pravatar.cc/150?img=12' }
              ].map(story => (
                <div key={story.name} className="bg-[#F8F9FC] p-6 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <img src={story.img} alt={story.name} className="w-10 h-10 rounded-full" />
                    <div>
                      <h4 className="font-bold text-[#1A1A1A] text-sm">{story.name}</h4>
                      <p className="text-xs text-gray-500">{story.role}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium italic">"{story.text}"</p>
                  <div className="flex gap-1 mt-4">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />)}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-[#0F0824] py-24 px-6 text-center relative overflow-hidden mt-10">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#6C2BFF]/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-block bg-white/10 px-4 py-1.5 rounded-full border border-white/20 mb-6">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em]">Ready To Level Up?</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black uppercase text-white leading-tight mb-6">
            Start Building <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C2BFF] to-[#EC4899]">Your Future</span> Today
          </h2>
          <p className="text-gray-400 text-lg mb-10">Join ambitious learners building real skills.</p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={() => {
              const el = document.getElementById('courses-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }} className="bg-[#6C2BFF] hover:bg-[#4B1DCC] text-white px-10 py-4 rounded-full font-bold transition-all shadow-[0_0_30px_rgba(108,43,255,0.4)]">
              Explore Courses →
            </button>
            <Link to="/learn/career-fit" className="bg-white text-[#1A1A1A] hover:bg-gray-100 px-10 py-4 rounded-full font-bold transition-all">
              Take Career Assessment
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursesOverview;